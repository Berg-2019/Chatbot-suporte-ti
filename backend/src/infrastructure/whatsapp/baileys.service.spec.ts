/**
 * Testes do BaileysService — helpers de detecção de mídia (RC#3).
 *
 * Não testamos downloadAndSaveMedia (depende de rede+Baileys real).
 * Testamos apenas os helpers puros: detectMedia e extMime.
 */

// Mock para evitar carregar @whiskeysockets/baileys (ESM-only) no Jest.
jest.mock('@whiskeysockets/baileys', () => ({
  __esModule: true,
  default: jest.fn(),
  DisconnectReason: { loggedOut: 'loggedOut' },
  useMultiFileAuthState: jest.fn(),
  fetchLatestBaileysVersion: jest.fn(),
  makeCacheableSignalKeyStore: jest.fn(),
  downloadMediaMessage: jest.fn(),
}));

import { BaileysService } from './baileys.service';

describe('BaileysService — mídia (RC#3)', () => {
  // Acessa métodos privados via any para testar diretamente
  const fakeConfig = { get: (k: string, d?: string) => d ?? null };
  const svc = new BaileysService(
    fakeConfig as any,
    null as any,
    null as any,
    null as any,
  ) as any;

  describe('detectMedia', () => {
    it('retorna null quando não há message', () => {
      expect(svc.detectMedia({ key: {} })).toBeNull();
      expect(svc.detectMedia({ key: {}, message: undefined })).toBeNull();
    });

    it('detecta imageMessage', () => {
      const msg = { key: {}, message: { imageMessage: { mimetype: 'image/jpeg' } } };
      const r = svc.detectMedia(msg);
      expect(r).toEqual({ type: 'IMAGE', mime: 'image/jpeg' });
    });

    it('detecta audioMessage e assume audio/ogg quando sem mime', () => {
      const msg = { key: {}, message: { audioMessage: {} } };
      const r = svc.detectMedia(msg);
      expect(r).toEqual({ type: 'AUDIO', mime: 'audio/ogg; codecs=opus' });
    });

    it('detecta videoMessage', () => {
      const msg = { key: {}, message: { videoMessage: { mimetype: 'video/mp4' } } };
      const r = svc.detectMedia(msg);
      expect(r).toEqual({ type: 'VIDEO', mime: 'video/mp4' });
    });

    it('detecta documentMessage e preserva fileName', () => {
      const msg = {
        key: {},
        message: { documentMessage: { mimetype: 'application/pdf', fileName: 'doc.pdf' } },
      };
      const r = svc.detectMedia(msg);
      expect(r).toEqual({ type: 'DOCUMENT', mime: 'application/pdf', fileName: 'doc.pdf' });
    });

    it('retorna null para mensagens só de texto', () => {
      const msg = { key: {}, message: { conversation: 'oi' } };
      expect(svc.detectMedia(msg)).toBeNull();
    });
  });

  describe('extMime', () => {
    const cases: [string | undefined, string][] = [
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['audio/ogg; codecs=opus', 'ogg'],
      ['video/mp4', 'mp4'],
      ['application/pdf', 'pdf'],
      ['image/webp', 'webp'],
      ['audio/mpeg', 'mp3'],
      [undefined, 'bin'],
      ['application/x-custom-stuff', 'xcustomstuff'],
      ['', 'bin'],
    ];
    for (const [mime, ext] of cases) {
      it(`${mime ?? 'undefined'} → .${ext}`, () => {
        expect(svc.extMime(mime)).toBe(ext);
      });
    }
  });
});
