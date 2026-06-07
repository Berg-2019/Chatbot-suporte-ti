import { UserOnboardingService } from './user-onboarding.service';

// Mock para evitar carregar @whiskeysockets/baileys (ESM-only) no Jest.
jest.mock(
  '../../../infrastructure/whatsapp/baileys.service',
  () =>
    class BaileysService {
      sendText = jest.fn();
    },
);

describe('UserOnboardingService', () => {
  const prisma = {
    userActivationToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
    },
  } as any;
  const mail = {
    sendAgentWelcome: jest.fn().mockResolvedValue({ transport: 'log-only' }),
  } as any;
  const baileys = {
    sendText: jest.fn().mockResolvedValue('wamid-xyz'),
  } as any;
  const config = {
    get: jest.fn().mockReturnValue('http://localhost:5173'),
  } as any;

  let svc: UserOnboardingService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new UserOnboardingService(prisma, mail, baileys, config);
  });

  it('invalida tokens anteriores, cria token e envia email', async () => {
    await svc.generateAndSend({ id: 'u1', name: 'Ana', email: 'a@b.com' });

    expect(prisma.userActivationToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    expect(prisma.userActivationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
    expect(mail.sendAgentWelcome).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.com', name: 'Ana' }),
    );
  });

  it('não envia WhatsApp quando não há telefone', async () => {
    await svc.generateAndSend({ id: 'u1', name: 'Ana', email: 'a@b.com' });
    expect(baileys.sendText).not.toHaveBeenCalled();
  });

  it('envia WhatsApp quando há telefone (jid com @s.whatsapp.net)', async () => {
    await svc.generateAndSend({
      id: 'u1',
      name: 'Ana',
      email: 'a@b.com',
      phoneNumber: '5569999998888',
    });
    expect(baileys.sendText).toHaveBeenCalledWith(
      '5569999998888@s.whatsapp.net',
      expect.stringContaining('http'),
    );
  });

  it('best-effort: se email lança, não propaga e ainda tenta whatsapp', async () => {
    mail.sendAgentWelcome.mockRejectedValueOnce(new Error('smtp down'));
    await expect(
      svc.generateAndSend({
        id: 'u1',
        name: 'Ana',
        email: 'a@b.com',
        phoneNumber: '5569999998888',
      }),
    ).resolves.toBeUndefined();
    expect(baileys.sendText).toHaveBeenCalled();
  });

  it('best-effort: se WhatsApp lança, não propaga', async () => {
    baileys.sendText.mockRejectedValueOnce(new Error('boom'));
    await expect(
      svc.generateAndSend({
        id: 'u1',
        name: 'Ana',
        email: 'a@b.com',
        phoneNumber: '5569999998888',
      }),
    ).resolves.toBeUndefined();
  });

  it('link inclui /set-password?token=', async () => {
    await svc.generateAndSend({ id: 'u1', name: 'Ana', email: 'a@b.com' });
    const arg = mail.sendAgentWelcome.mock.calls[0][0];
    expect(arg.link).toMatch(/\/set-password\?token=[a-f0-9]{64}$/);
  });

  it('ignora telefone vazio e não envia WhatsApp', async () => {
    await svc.generateAndSend({
      id: 'u1',
      name: 'Ana',
      email: 'a@b.com',
      phoneNumber: '   ',
    });
    expect(baileys.sendText).not.toHaveBeenCalled();
  });
});
