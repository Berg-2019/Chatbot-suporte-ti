/**
 * Rotas do Bot WhatsApp
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import whatsappService from '../services/whatsapp.js';

const router = Router();

/**
 * GET /api/bot/status
 * Status do bot
 */
router.get('/status', authMiddleware, (req: Request, res: Response) => {
  res.json(whatsappService.getStatus());
});

/**
 * GET /api/bot/qr
 * Obter QR Code
 */
router.get('/qr', authMiddleware, (req: Request, res: Response) => {
  const qr = whatsappService.getQRCode();
  if (qr) {
    res.json({ qrCode: qr });
  } else {
    res.status(404).json({ error: 'QR Code não disponível' });
  }
});

/**
 * GET /api/bot/pairing
 * Obter código de pareamento
 */
router.get('/pairing', authMiddleware, (req: Request, res: Response) => {
  const code = whatsappService.getPairingCode();
  if (code) {
    res.json({ pairingCode: code });
  } else {
    res.status(404).json({ error: 'Código não disponível' });
  }
});

/**
 * POST /api/bot/connect/qr
 * Conectar via QR Code
 */
router.post('/connect/qr', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    await whatsappService.connectWithQR();
    res.json({ message: 'Conexão iniciada, aguarde o QR Code' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bot/connect/pairing
 * Conectar via Pairing Code
 */
router.post('/connect/pairing', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: 'Número de telefone obrigatório' });
      return;
    }

    const code = await whatsappService.connectWithPairing(phone);
    res.json({ pairingCode: code });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bot/disconnect
 * Desconectar
 */
router.post('/disconnect', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    await whatsappService.disconnect();
    res.json({ message: 'Bot desconectado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bot/clear-session
 * Limpar sessão
 */
router.post('/clear-session', authMiddleware, adminOnly, async (req: Request, res: Response) => {
  try {
    await whatsappService.clearSession();
    res.json({ message: 'Sessão limpa' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bot/send
 * Enviar mensagem
 */
router.post('/send', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      res.status(400).json({ error: 'phone e message são obrigatórios' });
      return;
    }

    await whatsappService.sendMessage(phone, message);
    res.json({ message: 'Enviado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
