import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendMailResult {
  transport: 'smtp' | 'log-only';
  messageId?: string;
}

/**
 * MailService — envio de email reutilizável.
 *
 * Usa SMTP real via nodemailer quando SMTP_HOST + SMTP_USER + SMTP_PASS estão
 * setados nas env vars. Caso contrário, cai em modo log-only (placeholder
 * pra dev local sem credenciais).
 *
 * Hostinger SMTP (típico):
 *   SMTP_HOST=smtp.hostinger.com
 *   SMTP_PORT=465
 *   SMTP_SECURE=true        # true=SSL/465, false=STARTTLS/587
 *   SMTP_USER=helpdesk@seudominio.com.br
 *   SMTP_PASS=<senha do email>
 *   SMTP_FROM="Helpdesk MSM <helpdesk@seudominio.com.br>"
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.bootstrap();
  }

  private bootstrap(): void {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP_HOST/SMTP_USER/SMTP_PASS não configurados — modo log-only',
      );
      return;
    }
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = (process.env.SMTP_SECURE ?? 'true').toLowerCase() === 'true';
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    // Verificar conexão em background (não bloqueia boot)
    this.transporter
      .verify()
      .then(() =>
        this.logger.log(
          `SMTP transporter conectado em ${host}:${port} (secure=${secure})`,
        ),
      )
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`SMTP verify falhou: ${msg}`);
      });
  }

  /**
   * Envia um email genérico. No modo log-only apenas registra no logger.
   * Lança em caso de falha real de SMTP (caller decide como tratar).
   */
  async sendMail(input: SendMailInput): Promise<SendMailResult> {
    if (!this.transporter) {
      const subjectShort = input.subject.slice(0, 60);
      this.logger.log(
        `email DRY-RUN to=${input.to} subject="${subjectShort}"`,
      );
      return { transport: 'log-only' };
    }

    const from =
      process.env.SMTP_FROM ||
      `Helpdesk MSM <${process.env.SMTP_USER}>`;

    const info = await this.transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    this.logger.log(
      `email sent to=${input.to} subject="${input.subject.slice(0, 60)}" messageId=${info.messageId}`,
    );
    return { transport: 'smtp', messageId: info.messageId };
  }

  /**
   * Boas-vindas de agente — link de ativação (PT-BR).
   * O link expira em 1 hora ( TTL definido pelo emissor do token).
   */
  async sendAgentWelcome(p: {
    to: string;
    name: string;
    link: string;
  }): Promise<SendMailResult> {
    const subject = 'Bem-vindo(a) ao Helpdesk MSM — defina sua senha';
    const text = [
      `Olá, ${p.name}!`,
      '',
      'Sua conta no Helpdesk MSM foi criada.',
      `Login: ${p.to}`,
      'Defina sua senha de acesso (link válido por 1 hora):',
      p.link,
      '',
      '— Equipe Helpdesk MSM',
    ].join('\n');

    const html = `
<p>Olá, <b>${p.name}</b>!</p>
<p>Sua conta no Helpdesk MSM foi criada.</p>
<p><b>Login:</b> ${p.to}</p>
<p>
  <a href="${p.link}"
     style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">
    Definir minha senha
  </a>
</p>
<p>Ou copie o link abaixo (válido por 1 hora):<br>${p.link}</p>
<p>— Equipe Helpdesk MSM</p>`;

    return this.sendMail({ to: p.to, subject, text, html });
  }
}
