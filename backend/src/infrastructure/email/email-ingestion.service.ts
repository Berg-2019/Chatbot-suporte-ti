/**
 * Email Ingestion Service
 * Polls IMAP inbox and converts emails to tickets
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { TicketsService } from '../../presentation/controllers/tickets/tickets.service';
import { ContactsService } from '../../presentation/controllers/contacts/contacts.service';

@Injectable()
export class EmailIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailIngestionService.name);
  private pollIntervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    private prisma: PrismaService,
    private ticketsService: TicketsService,
    private contactsService: ContactsService,
  ) {}

  async onModuleInit() {
    // Start automatically if enabled
    const config = await this.getConfig();
    if (config?.enabled) {
      await this.startPolling();
    }
  }

  async onModuleDestroy() {
    await this.stopPolling();
  }

  async getConfig() {
    return this.prisma.emailConfig.findFirst();
  }

  async startPolling() {
    const config = await this.getConfig();
    if (!config || !config.enabled) {
      this.logger.warn('Email ingestion is disabled');
      return;
    }

    this.logger.log(`Starting email polling (every ${config.pollInterval}s)`);

    // Initial processing
    this.processNewEmails();

    // Setup interval
    this.pollIntervalId = setInterval(() => {
      this.processNewEmails();
    }, config.pollInterval * 1000);
  }

  async stopPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
      this.logger.log('Email polling stopped');
    }
  }

  private async processNewEmails() {
    if (this.isProcessing) {
      this.logger.debug('Already processing emails, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const config = await this.getConfig();
      if (!config) return;

      const imap = await this.connectImap(config);
      const emails = await this.fetchUnreadEmails(imap);

      this.logger.log(`Found ${emails.length} unread emails`);

      for (const email of emails) {
        try {
          await this.processEmail(email, config);
        } catch (error) {
          this.logger.error(`Failed to process email: ${error.message}`);
        }
      }

      imap.end();
    } catch (error) {
      this.logger.error(`Email processing failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private connectImap(config: any): Promise<Imap> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: config.imapUser,
        password: config.imapPassword, // TODO: Decrypt in production
        host: config.imapHost,
        port: config.imapPort,
        tls: config.imapTls,
        tlsOptions: { rejectUnauthorized: false },
      });

      imap.once('ready', () => resolve(imap));
      imap.once('error', reject);

      imap.connect();
    });
  }

  private fetchUnreadEmails(imap: Imap): Promise<ParsedMail[]> {
    return new Promise((resolve, reject) => {
      imap.openBox('INBOX', false, (err) => {
        if (err) return reject(err);

        imap.search(['UNSEEN'], async (err, results) => {
          if (err) return reject(err);
          if (!results || results.length === 0) return resolve([]);

          const emails: ParsedMail[] = [];
          const fetch = imap.fetch(results, { bodies: '' });

          fetch.on('message', (msg) => {
            msg.on('body', async (stream) => {
              try {
                const parsed = await simpleParser(stream);
                emails.push(parsed);
              } catch (error) {
                this.logger.error(`Failed to parse email: ${error.message}`);
              }
            });
          });

          fetch.once('error', reject);
          fetch.once('end', () => {
            // Mark as read
            if (results.length > 0) {
              imap.addFlags(results, ['\\Seen'], (err) => {
                if (err) this.logger.error(`Failed to mark as read: ${err.message}`);
              });
            }
            resolve(emails);
          });
        });
      });
    });
  }

  private async processEmail(email: ParsedMail, config: any) {
    // Check if already processed
    const existing = await this.prisma.emailTicketMapping.findUnique({
      where: { emailId: email.messageId },
    });

    if (existing) {
      this.logger.debug(`Email ${email.messageId} already processed`);
      return;
    }

    // Check if it's a reply to existing ticket
    const threadId = this.extractThreadId(email);
    const existingThread = threadId
      ? await this.prisma.emailTicketMapping.findFirst({
          where: { threadId },
          include: { ticket: true },
        })
      : null;

    if (existingThread) {
      // Add message to existing ticket
      await this.addMessageToTicket(existingThread.ticket, email);
    } else {
      // Create new ticket
      await this.createTicketFromEmail(email, config);
    }
  }

  private async createTicketFromEmail(email: ParsedMail, config: any) {
    const fromEmail = email.from?.value[0]?.address || 'unknown@email.com';
    const fromName = email.from?.value[0]?.name || fromEmail.split('@')[0];
    const subject = email.subject || 'Sem assunto';
    const body = this.cleanEmailBody(email.text || email.html || '');

    // Find or create contact
    let contact = await this.prisma.contact.findFirst({
      where: { email: fromEmail },
    });

    if (!contact) {
      contact = await this.contactsService.create({
        jid: `email-${fromEmail}`, // Unique JID for email contacts
        phoneNumber: 'email-only',
        name: fromName,
        sector: config.defaultSector || 'Email',
        email: fromEmail,
      });
    }

    // Create ticket
    const ticket = await this.ticketsService.create({
      title: subject,
      description: body,
      phoneNumber: contact.phoneNumber,
      customerName: contact.name,
      sector: config.defaultSector || 'TI',
      category: 'Email',
      priority: config.defaultPriority || 'NORMAL',
    });

    // Create mapping
    await this.prisma.emailTicketMapping.create({
      data: {
        ticketId: ticket.id,
        emailId: email.messageId,
        threadId: this.extractThreadId(email) || email.messageId,
        fromEmail,
        toEmail: config.imapUser,
        subject,
      },
    });

    this.logger.log(`✅ Ticket created from email: ${ticket.id} (${subject})`);

    return ticket;
  }

  private async addMessageToTicket(ticket: any, email: ParsedMail) {
    const body = this.cleanEmailBody(email.text || email.html || '');

    await this.prisma.message.create({
      data: {
        ticketId: ticket.id,
        content: body,
        direction: 'INCOMING',
        type: 'TEXT',
        isInternal: false,
      },
    });

    this.logger.log(`Message added to ticket ${ticket.id} from email`);
  }

  private extractThreadId(email: ParsedMail): string | null {
    return email.inReplyTo || (email.references && email.references[0]) || null;
  }

  private cleanEmailBody(body: string): string {
    // Remove HTML tags
    let cleaned = body.replace(/<[^>]*>/g, '');
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Limit size
    cleaned = cleaned.substring(0, 5000);
    return cleaned;
  }
}
