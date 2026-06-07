// Mock para evitar carregar @whiskeysockets/baileys (ESM-only) no Jest.
jest.mock(
  '../onboarding/user-onboarding.service',
  () => ({
    UserOnboardingService: class {},
    hashToken: (s: string) => {
      // sha256 hex para coincidir com a impl real
      const { createHash } = require('crypto');
      return createHash('sha256').update(s).digest('hex');
    },
    ACTIVATION_TTL_MS: 60 * 60 * 1000,
  }),
);

import { GoneException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService — ativação de agente', () => {
  const prisma: any = {
    user: { findUnique: jest.fn(), update: jest.fn().mockReturnValue({}) },
    userActivationToken: { findUnique: jest.fn(), update: jest.fn().mockReturnValue({}) },
    $transaction: jest.fn(),
  };
  const jwt: any = { sign: jest.fn().mockReturnValue('jwt') };
  const config: any = { get: jest.fn() };

  let svc: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Evita criar admin no construtor (User.findUnique retorna algo)
    prisma.user.findUnique.mockResolvedValue({ id: 'admin' });
    svc = new AuthService(prisma, jwt, config);
  });

  it('validateActivationToken retorna {name,email} quando token é válido', async () => {
    prisma.userActivationToken.findUnique.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { name: 'Ana', email: 'ana@x.com' },
    });

    const result = await svc.validateActivationToken('raw-token-xyz');
    expect(result).toEqual({ name: 'Ana', email: 'ana@x.com' });
  });

  it('validateActivationToken lança GoneException se token não existe', async () => {
    prisma.userActivationToken.findUnique.mockResolvedValue(null);
    await expect(svc.validateActivationToken('x')).rejects.toThrow(GoneException);
  });

  it('validateActivationToken lança GoneException se token já foi usado', async () => {
    prisma.userActivationToken.findUnique.mockResolvedValue({
      id: 't1',
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: { name: 'A', email: 'a@x.com' },
    });
    await expect(svc.validateActivationToken('x')).rejects.toThrow(GoneException);
  });

  it('validateActivationToken lança GoneException se token expirou', async () => {
    prisma.userActivationToken.findUnique.mockResolvedValue({
      id: 't1',
      usedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
      user: { name: 'A', email: 'a@x.com' },
    });
    await expect(svc.validateActivationToken('x')).rejects.toThrow(GoneException);
  });

  it('activateUser executa transação (user.update + token.update) para token válido', async () => {
    prisma.userActivationToken.findUnique.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.$transaction.mockResolvedValue([]);

    const result = await svc.activateUser('raw-token', '12345678');
    expect(result).toEqual({ ok: true });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // Os args da transação são 2 chamadas encadeadas (user.update + token.update) — não inspeccionamos
  });

  it('activateUser lança GoneException se token já consumido (race entre GET e POST)', async () => {
    prisma.userActivationToken.findUnique.mockResolvedValue({
      id: 't1',
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(svc.activateUser('raw', '12345678')).rejects.toThrow(GoneException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
