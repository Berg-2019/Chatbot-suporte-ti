import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { MailService } from '../../../infrastructure/mail/mail.service';
import { BaileysService } from '../../../infrastructure/whatsapp/baileys.service';

export const ACTIVATION_TTL_MS = 60 * 60 * 1000; // 1h

/**
 * Calcula o sha256 hex de um token cru. Apenas o hash é persistido.
 */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export interface OnboardingUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
}

/**
 * UserOnboardingService
 *
 * Orquestra o onboarding de agentes:
 * - gera token de ativação (uso único, 1h) e persiste apenas o hash
 * - envia link por email (sempre, best-effort)
 * - envia link por WhatsApp (se houver telefone, best-effort)
 *
 * Falhas em email/WhatsApp são logadas mas NÃO propagam — a criação do
 * usuário nunca falha por erro de envio. Cobertas por reenvio admin.
 */
@Injectable()
export class UserOnboardingService {
  private readonly logger = new Logger('UserOnboarding');

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly baileys: BaileysService,
    private readonly config: ConfigService,
  ) {}

  async generateAndSend(user: OnboardingUser): Promise<void> {
    // 1. invalida tokens anteriores não usados do usuário
    await this.prisma.userActivationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // 2. gera novo token (cru + hash); só persiste o hash
    const raw = randomBytes(32).toString('hex');
    const tokenHash = hashToken(raw);
    const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
    await this.prisma.userActivationToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // 3. monta link público (não logar acima de debug)
    const base = this.resolvePublicUrl();
    const link = `${base}/set-password?token=${raw}`;

    // 4. email (best-effort)
    try {
      await this.mail.sendAgentWelcome({
        to: user.email,
        name: user.name,
        link,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Falha ao enviar email de ativação para ${user.email}: ${msg}`,
      );
    }

    // 5. WhatsApp (best-effort; sendText retorna null se bot desconectado)
    if (user.phoneNumber) {
      try {
        const digits = user.phoneNumber.replace(/\D/g, '');
        if (!digits) {
          this.logger.warn(
            `Telefone inválido para ${user.email}: "${user.phoneNumber}"`,
          );
        } else {
          const jid = `${digits}@s.whatsapp.net`;
          const msg = [
            `Olá, ${user.name}! 👋`,
            'Sua conta no Helpdesk MSM foi criada.',
            'Defina sua senha de acesso (link válido por 1 hora):',
            link,
          ].join('\n');
          const wamid = await this.baileys.sendText(jid, msg);
          if (!wamid) {
            this.logger.warn(
              `WhatsApp não enviado para ${jid} (bot desconectado?)`,
            );
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Falha ao enviar WhatsApp de ativação: ${msg}`);
      }
    }
  }

  private resolvePublicUrl(): string {
    const fromEnv = this.config.get<string>('APP_PUBLIC_URL');
    if (fromEnv && fromEnv.trim().length > 0) {
      return fromEnv.replace(/\/+$/, '');
    }
    const frontend = process.env.FRONTEND_URL || '';
    const first = frontend.split(',')[0].trim();
    if (first) return first.replace(/\/+$/, '');
    return 'http://localhost:5173';
  }
}
