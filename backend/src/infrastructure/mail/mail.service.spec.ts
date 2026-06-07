import { MailService } from './mail.service';

describe('MailService', () => {
  let originalSmtpHost: string | undefined;
  let originalSmtpUser: string | undefined;
  let originalSmtpPass: string | undefined;

  beforeAll(() => {
    originalSmtpHost = process.env.SMTP_HOST;
    originalSmtpUser = process.env.SMTP_USER;
    originalSmtpPass = process.env.SMTP_PASS;
  });

  afterAll(() => {
    if (originalSmtpHost === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = originalSmtpHost;
    if (originalSmtpUser === undefined) delete process.env.SMTP_USER;
    else process.env.SMTP_USER = originalSmtpUser;
    if (originalSmtpPass === undefined) delete process.env.SMTP_PASS;
    else process.env.SMTP_PASS = originalSmtpPass;
  });

  it('modo log-only quando SMTP não configurado: não lança e retorna transport log-only', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    const svc = new MailService();
    const res = await svc.sendMail({ to: 'a@b.com', subject: 'assunto', text: 't' });
    expect(res.transport).toBe('log-only');
  });

  it('sendAgentWelcome monta link no corpo (log-only não lança)', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    const svc = new MailService();
    const res = await svc.sendAgentWelcome({
      to: 'a@b.com',
      name: 'Ana',
      link: 'http://x/set-password?token=abc',
    });
    expect(res.transport).toBe('log-only');
  });
});
