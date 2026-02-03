/**
 * Bot API Server - Expõe endpoints para controle do bot via painel admin
 */

import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';
import { whatsappHandler } from './handlers/whatsapp-handler.js';

import path from 'path';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Servir arquivos de mídia estáticos
app.use('/media', express.static(path.join(process.cwd(), 'uploads')));

/**
 * GET /api/status - Status do bot
 */
app.get('/api/status', (req, res) => {
  const rawStatus = whatsappHandler.getStatus();

  // Converter para formato esperado pelo frontend
  let status = 'disconnected';
  if (rawStatus.connected) {
    status = 'connected';
  } else if (rawStatus.connectionState === 'waiting_qr' || rawStatus.hasQR) {
    status = 'qr_ready';
  } else if (rawStatus.connectionState === 'connecting') {
    status = 'connecting';
  }

  res.json({
    status,
    uptime: rawStatus.uptime ? Math.floor(rawStatus.uptime / 1000) : 0,
    connectedNumber: rawStatus.phoneNumber,
    messagesReceived: 0,
    messagesSent: 0,
  });
});

/**
 * GET /api/qr - QR Code atual (imagem base64)
 */
app.get('/api/qr', async (req, res) => {
  const qr = whatsappHandler.getCurrentQR();
  if (qr) {
    try {
      // Converter string QR para imagem base64
      const qrImage = await QRCode.toDataURL(qr, { width: 256, margin: 2 });
      res.json({ qrCode: qrImage, status: 'qr_ready', available: true });
    } catch (err) {
      console.error('Erro ao gerar QR image:', err);
      res.json({ qrCode: null, status: 'error', available: false, message: 'Erro ao gerar imagem QR' });
    }
  } else {
    res.json({ qrCode: null, status: 'waiting', available: false, message: 'QR Code não disponível ainda' });
  }
});

/**
 * POST /api/pairing-code - Gera código de pareamento
 * Body: { phoneNumber: "5511999999999" }
 */
app.post('/api/pairing-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Número de telefone obrigatório' });
    }

    // Formatar número (remover + e espaços)
    const formattedNumber = phoneNumber.replace(/\D/g, '');

    const code = await whatsappHandler.requestPairingCode(formattedNumber);

    if (code) {
      res.json({ pairingCode: code, status: 'success', expiresIn: 60 });
    } else {
      res.status(400).json({ pairingCode: null, status: 'error', message: 'Não foi possível gerar código' });
    }
  } catch (error) {
    console.error('❌ Erro ao gerar pairing code:', error.message);
    res.status(500).json({ error: error.message, success: false });
  }
});

/**
 * POST /api/disconnect - Desconecta o WhatsApp
 */
app.post('/api/disconnect', async (req, res) => {
  try {
    await whatsappHandler.disconnect();
    res.json({ success: true, message: 'Desconectado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/restart - Reinicia conexão
 */
app.post('/api/restart', async (req, res) => {
  try {
    await whatsappHandler.restart();
    res.json({ success: true, message: 'Reiniciando conexão...' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/logout - Faz logout e limpa sessão
 */
app.post('/api/logout', async (req, res) => {
  try {
    await whatsappHandler.logout();
    res.json({ success: true, message: 'Sessão encerrada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export function startApiServer() {
  return new Promise((resolve) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 API Server rodando em http://0.0.0.0:${PORT}`);
      resolve();
    });
  });
}
