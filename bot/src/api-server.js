/**
 * Bot API Server - Expõe endpoints para controle do bot via painel admin
 */

import express from 'express';
import cors from 'cors';
import { whatsappHandler } from './handlers/whatsapp-handler.js';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

/**
 * GET /api/status - Status do bot
 */
app.get('/api/status', (req, res) => {
  const status = whatsappHandler.getStatus();
  res.json(status);
});

/**
 * GET /api/qr - QR Code atual (string para gerar imagem no frontend)
 */
app.get('/api/qr', (req, res) => {
  const qr = whatsappHandler.getCurrentQR();
  if (qr) {
    res.json({ qr, available: true });
  } else {
    res.json({ qr: null, available: false });
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
      res.json({ code, success: true });
    } else {
      res.status(400).json({ error: 'Não foi possível gerar código', success: false });
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
