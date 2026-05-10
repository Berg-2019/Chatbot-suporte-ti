/**
 * Outgoing Media Consumer
 *
 * Consome a fila `message.created` do RabbitMQ e envia mídia para o WhatsApp
 * via Hermes WhatsApp bridge. Implementa idempotência via waMessageId.
 *
 * Fluxo (HTTP-only — zero volume compartilhado):
 * 1. Recebe message.created (OUTGOING com mediaUrl)
 * 2. Busca phoneNumber do ticket
 * 3. Faz download da mídia do backend via HTTP (Buffer)
 * 4. Envia via POST /send-media-buffer do WhatsApp bridge (base64)
 * 5. Atualiza waMessageId no backend
 *
 * Vantagens:
 * - Backend e Hermes totalmente desacoplados
 * - Sem volume compartilhado, sem mount, sem mudança de infra
 * - Pronto pra migrar pra S3/R2: só muda BACKEND_URL
 */

import amqp from 'amqplib';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://helpdesk:helpdesk123@rabbitmq:5672';
const WHATSAPP_BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || 'http://localhost:3000';
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || 'http://localhost:3000';
const HERMES_API_KEY = process.env.HERMES_API_KEY || 'hermes_dev_key_change_me';

let connection = null;
let channel = null;

async function connect() {
  console.log('[consumer] 🔗 Conectando ao RabbitMQ...');
  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertQueue('outgoing_messages', { durable: true });

  console.log('[consumer] ✅ RabbitMQ conectado');
  return channel;
}

async function updateWaMessageId(messageId, waMessageId) {
  try {
    await axios.patch(
      `${BACKEND_ORIGIN}/api/chat/messages/${messageId}/wa-id`,
      { waMessageId },
      { headers: { 'x-api-key': HERMES_API_KEY }, timeout: 5000 }
    );
    console.log(`[consumer] ✅ waMessageId atualizado: ${messageId} → ${waMessageId}`);
  } catch (err) {
    console.warn(`[consumer] ⚠️ Falha ao atualizar waMessageId para ${messageId}:`, err.message);
  }
}

async function downloadMediaAsBase64(messageId, fileName) {
  const fullUrl = `${BACKEND_ORIGIN}/api/chat/media-internal/${messageId}`;

  console.log(`[consumer] 📥 Baixando: ${fullUrl}`);

  const response = await axios.get(fullUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'x-api-key': HERMES_API_KEY },
  });

  const base64 = Buffer.from(response.data, 'binary').toString('base64');
  const contentType = response.headers['content-type'] || '';
  const resolvedFileName = fileName || 'document';

  console.log(`[consumer] 📁 Baixado: ${resolvedFileName} (${Buffer.byteLength(response.data)} bytes)`);
  return { base64, mimeType: contentType, fileName: resolvedFileName };
}

async function sendViaBridgeBuffer(chatId, base64, mediaType, caption, fileName, mimeType) {
  const payload = {
    chatId,
    base64,
    mediaType,
    caption: caption || '',
    fileName: fileName || undefined,
    mimeType: mimeType || undefined,
  };

  console.log(`[consumer] 📤 Enviando para bridge: ${WHATSAPP_BRIDGE_URL}/send-media-buffer`);

  const response = await axios.post(
    `${WHATSAPP_BRIDGE_URL}/send-media-buffer`,
    payload,
    { timeout: 60000 }
  );

  return response.data;
}

async function handleMessageCreated(msg) {
  let data;
  try {
    data = JSON.parse(msg.content.toString());
  } catch {
    console.error('[consumer] ❌ Mensagem inválida (não é JSON)');
    channel.ack(msg);
    return;
  }

  const { ticketId, messageId, direction, type, mediaUrl, waMessageId, content, fileName } = data;

  if (direction !== 'OUTGOING') {
    channel.ack(msg);
    return;
  }

  if (waMessageId) {
    console.log(`[consumer] ℹ️ ${messageId} já tem waMessageId — idempotência ok`);
    channel.ack(msg);
    return;
  }

  console.log(`[consumer] 📋 message.created: ${messageId} | tipo: ${type} | media: ${!!mediaUrl}`);

  try {
    const ticketRes = await axios.get(`${BACKEND_ORIGIN}/api/tickets/${ticketId}`, {
      headers: { 'x-api-key': HERMES_API_KEY },
      timeout: 5000,
    });
    const ticket = ticketRes.data;

    if (!ticket?.phoneNumber) {
      console.warn('[consumer] ⚠️ Ticket sem phoneNumber — ignorando');
      channel.ack(msg);
      return;
    }

    const chatId = ticket.phoneNumber.includes('@')
      ? ticket.phoneNumber
      : `${ticket.phoneNumber}@s.whatsapp.net`;

    const mediaTypeMap = { IMAGE: 'image', AUDIO: 'audio', VIDEO: 'video', DOCUMENT: 'document' };
    const resolvedMediaType = mediaTypeMap[type] || 'document';

    if (mediaUrl && ['IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT'].includes(type)) {
      const { base64, mimeType, fileName: resolvedFileName } = await downloadMediaAsBase64(messageId, fileName);

      const result = await sendViaBridgeBuffer(
        chatId,
        base64,
        resolvedMediaType,
        content || '',
        resolvedFileName,
        mimeType
      );

      const sentWaId = result?.messageId || result?.id;
      if (sentWaId) {
        await updateWaMessageId(messageId, sentWaId);
        console.log(`[consumer] ✅ ${resolvedMediaType} enviado: ${sentWaId}`);
      } else {
        console.warn('[consumer] ⚠️ Resposta sem messageId:', result);
      }
    } else if (type === 'TEXT' && content) {
      const resp = await axios.post(
        `${WHATSAPP_BRIDGE_URL}/send`,
        { chatId, message: content },
        { timeout: 15000 }
      );

      const sentWaId = resp.data?.messageId;
      if (sentWaId) {
        await updateWaMessageId(messageId, sentWaId);
        console.log(`[consumer] ✅ texto enviado: ${sentWaId}`);
      }
    } else {
      console.log(`[consumer] ℹ️ type=${type} sem conteúdo para enviar`);
    }

    channel.ack(msg);
  } catch (err) {
    console.error(`[consumer] ❌ Erro ao processar ${messageId}:`, err.message);

    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      console.warn('[consumer] 🔴 Serviço externo indisponível — requeue');
      channel.nack(msg, false, true);
    } else if (err.response?.status === 404) {
      console.warn('[consumer] ⚠️ 404 — ack para não loopar');
      channel.ack(msg);
    } else {
      channel.nack(msg, false, false);
    }
  }
}

async function startConsuming() {
  await connect();

  console.log('[consumer] 📥 Consumindo: outgoing_messages');
  channel.consume('outgoing_messages', handleMessageCreated, { noAck: false });

  console.log('[consumer] ✅ Ativo — aguardando...');

  connection.on('error', (err) => {
    console.error('[consumer] ❌ Erro conexão RabbitMQ:', err.message);
    setTimeout(startConsuming, 5000);
  });

  connection.on('close', () => {
    console.warn('[consumer] ⚠️ Conexão fechada — reconectando...');
    setTimeout(startConsuming, 5000);
  });
}

startConsuming().catch(console.error);

process.on('SIGINT', async () => {
  console.log('\n[consumer] 🛑 Encerrando...');
  if (channel) await channel.close();
  if (connection) await connection.close();
  process.exit(0);
});