import * as bcrypt from 'bcryptjs';

// Mock para evitar carregar @whiskeysockets/baileys (ESM-only) no Jest.
jest.mock(
  '../onboarding/user-onboarding.service',
  () =>
    class UserOnboardingService {
      generateAndSend = jest.fn();
      hashToken = (s: string) => s;
    },
);

import { UsersService } from './users.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserOnboardingService } from '../onboarding/user-onboarding.service';

describe('UsersService', () => {
  const prisma: any = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const onboarding = { generateAndSend: jest.fn().mockResolvedValue(undefined) } as any;

  let svc: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new UsersService(prisma, onboarding as unknown as UserOnboardingService);
  });

  describe('createLocal', () => {
    it('sem senha: cria pendente (activatedAt=null) e dispara onboarding', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u1', email: 'ana@x.com', name: 'Ana', phoneNumber: null, activatedAt: null,
      });

      const result = await svc.createLocal({ name: 'Ana', email: 'ana@x.com' });

      expect(result.activatedAt).toBeNull();
      const createArg = prisma.user.create.mock.calls[0][0];
      expect(createArg.data.activatedAt).toBeNull();
      // hash aleatório: qualquer string de tamanho razoável
      expect(createArg.data.password).toEqual(expect.any(String));
      expect(createArg.data.password.length).toBeGreaterThan(40);
      expect(onboarding.generateAndSend).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', email: 'ana@x.com' }),
      );
    });

    it('com senha: cria ativado e NÃO dispara onboarding', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u2', email: 'bob@x.com', name: 'Bob', activatedAt: new Date(),
      });

      const result = await svc.createLocal({ name: 'Bob', email: 'bob@x.com', password: '12345678' });

      expect(result.activatedAt).toBeInstanceOf(Date);
      const createArg = prisma.user.create.mock.calls[0][0];
      expect(createArg.data.activatedAt).toBeInstanceOf(Date);
      // hash da senha informada
      expect(await bcrypt.compare('12345678', createArg.data.password)).toBe(true);
      expect(onboarding.generateAndSend).not.toHaveBeenCalled();
    });

    it('com telefone: repassa para o onboarding', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u3', email: 'c@x.com', name: 'C', phoneNumber: '5569999998888', activatedAt: null,
      });

      await svc.createLocal({
        name: 'C', email: 'c@x.com', phoneNumber: '5569999998888',
      });

      expect(onboarding.generateAndSend).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: '5569999998888' }),
      );
    });

    it('rejeita email duplicado', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'x' });
      await expect(svc.createLocal({ name: 'A', email: 'dup@x.com' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('onboarding falhando NÃO bloqueia a criação', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u4', email: 'd@x.com', name: 'D', phoneNumber: null, activatedAt: null,
      });
      onboarding.generateAndSend.mockRejectedValueOnce(new Error('smtp down'));

      await expect(svc.createLocal({ name: 'D', email: 'd@x.com' })).resolves.toBeDefined();
    });
  });

  describe('resendActivation', () => {
    it('lança NotFound se usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.resendActivation('nope')).rejects.toThrow(NotFoundException);
    });

    it('lança BadRequest se já ativado', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u', activatedAt: new Date() });
      await expect(svc.resendActivation('u')).rejects.toThrow(BadRequestException);
    });

    it('chama onboarding para usuário pendente', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u', name: 'A', email: 'a@x.com', phoneNumber: null, activatedAt: null,
      });
      await svc.resendActivation('u');
      expect(onboarding.generateAndSend).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u' }),
      );
    });
  });
});
