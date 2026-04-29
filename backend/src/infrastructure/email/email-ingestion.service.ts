/**
 * Email Ingestion Service - PRODUCTION-READY VERSION
 * Robust email polling with error handling, retry, and circuit breaker
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Sector } from '@prisma/client';
import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { TicketsService } from '../../presentation/controllers/tickets/tickets.service';
import { ContactsService } from '../../presentation/controllers/contacts/contacts.service';

interface EmailConfig {
  id: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  imapTls: boolean;
  enabled: boolean;
  pollInterval: number;
  defaultPriority: string;
  defaultSector: string | null;
}

@Injectable()
export class EmailIngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailIngestionService.name);
  private pollIntervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  // Circuit Breaker Pattern
  private failureCount = 0;
  private readonly maxFailures = 5; // Open circuit after 5 consecutive failures
  private circuitOpen = false;
  private circuitOpenUntil: Date | null = null;
  private readonly circuitResetTime = 300000; // 5 minutes

  // Retry Configuration
  private readonly maxRetries = 3;
  private readonly retryDelay = 5000; // 5 seconds

  // Health Metrics
  private lastSuccessfulPoll: Date | null = null;
  private totalEmailsProcessed = 0;
  private totalErrors = 0;

  constructor(
    private prisma: PrismaService,
    private ticketsService: TicketsService,
    private contactsService: ContactsService,
  ) {}

  async onModuleInit() {
    try {
      const config = await this.getConfig();
      if (config?.enabled) {
        await this.startPolling();
        this.logger.log('✅ Email ingestion service initialized');
      } else {
        this.logger.warn('⚠️  Email ingestion is disabled');
      }
    } catch (error) {
      this.logger.error(`❌ Failed to initialize email ingestion: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    this.logger.log('🛑 Shutting down email ingestion service...');
    await this.stopPolling();
    this.logger.log('✅ Email ingestion service stopped gracefully');
  }

  async getConfig(): Promise<EmailConfig | null> {
    try {
      return await this.prisma.emailConfig.findFirst();
    } catch (error) {
      this.logger.error(`Failed to get email config: ${error.message}`);
      return null;
    }
  }

  async startPolling() {
    const config = await this.getConfig();
    if (!config || !config.enabled) {
      this.logger.warn('Email ingestion is disabled or not configured');
      return;
    }

    // Validate configuration
    if (!this.validateConfig(config)) {
      this.logger.error('❌ Invalid email configuration. Polling not started.');
      return;
    }

    this.logger.log(`🚀 Starting email polling (every ${config.pollInterval}s)`);

    // Initial processing with delay
    setTimeout(() => this.processNewEmails(), 2000);

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

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      isRunning: this.pollIntervalId !== null,
      isProcessing: this.isProcessing,
      circuitOpen: this.circuitOpen,
      failureCount: this.failureCount,
      lastSuccessfulPoll: this.lastSuccessfulPoll,
      totalEmailsProcessed: this.totalEmailsProcessed,
      totalErrors: this.totalErrors,
      uptime: this.lastSuccessfulPoll
        ? Date.now() - this.lastSuccessfulPoll.getTime()
        : null,
    };
  }

  private validateConfig(config: EmailConfig): boolean {
    if (!config.imapHost || !config.imapUser || !config.imapPassword) {
      this.logger.error('Missing required IMAP configuration');
      return false;
    }

    if (config.imapPort < 1 || config.imapPort > 65535) {
      this.logger.error('Invalid IMAP port');
      return false;
    }

    return true;
  }

  private async processNewEmails() {
    // Check if already processing
    if (this.isProcessing) {
      this.logger.debug('Already processing emails, skipping...');
      return;
    }

    // Check circuit breaker
    if (this.isCircuitOpen()) {
      this.logger.warn(
        `⚡ Circuit breaker is OPEN. Skipping poll until ${this.circuitOpenUntil}`,
      );
      return;
    }

    this.isProcessing = true;
    let imap: Imap | null = null;

    try {
      const config = await this.getConfig();
      if (!config) {
        this.logger.warn('No email configuration found');
        return;
      }

      // Connect to IMAP with retry
      imap = await this.connectImapWithRetry(config);

      // Fetch emails
      const emails = await this.fetchUnreadEmails(imap);

      this.logger.log(`📧 Found ${emails.length} unread emails`);

      // Process each email
      let successCount = 0;
      let errorCount = 0;

      for (const email of emails) {
        try {
          await this.processEmailWithRetry(email, config);
          successCount++;
          this.totalEmailsProcessed++;
        } catch (error) {
          errorCount++;
          this.totalErrors++;
          this.logger.error(
            `❌ Failed to process email ${email.messageId}: ${error.message}`,
            error.stack,
          );
        }
      }

      // Success - reset circuit breaker
      this.onSuccess();

      this.logger.log(
        `✅ Email processing complete: ${successCount} success, ${errorCount} errors`,
      );
    } catch (error) {
      this.onFailure(error);
      this.logger.error(`❌ Email processing failed: ${error.message}`, error.stack);
    } finally {
      // Always close IMAP connection
      if (imap) {
        try {
          imap.end();
        } catch (error) {
          this.logger.warn(`Failed to close IMAP connection: ${error.message}`);
        }
      }

      this.isProcessing = false;
    }
  }

  private async connectImapWithRetry(config: EmailConfig): Promise<Imap> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.debug(`Connecting to IMAP (attempt ${attempt}/${this.maxRetries})`);

        const imap = await this.connectImap(config);

        this.logger.log('✅ IMAP connection established');
        return imap;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `⚠️  IMAP connection failed (attempt ${attempt}/${this.maxRetries}): ${error.message}`,
        );

        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay);
        }
      }
    }

    throw new Error(
      `Failed to connect to IMAP after ${this.maxRetries} attempts: ${lastError?.message}`,
    );
  }

  private connectImap(config: EmailConfig): Promise<Imap> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('IMAP connection timeout (30s)'));
      }, 30000);

      const imap = new Imap({
        user: config.imapUser,
        password: config.imapPassword, // TODO: Decrypt in production
        host: config.imapHost,
        port: config.imapPort,
        tls: config.imapTls,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 20000,
        authTimeout: 15000,
      });

      imap.once('ready', () => {
        clearTimeout(timeout);
        resolve(imap);
      });

      imap.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      imap.connect();
    });
  }

  private fetchUnreadEmails(imap: Imap): Promise<ParsedMail[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Email fetch timeout (60s)'));
      }, 60000);

      imap.openBox('INBOX', false, (err) => {
        if (err) {
          clearTimeout(timeout);
          return reject(err);
        }

        imap.search(['UNSEEN'], async (err, results) => {
          if (err) {
            clearTimeout(timeout);
            return reject(err);
          }

          if (!results || results.length === 0) {
            clearTimeout(timeout);
            return resolve([]);
          }

          const emails: ParsedMail[] = [];
          const fetch = imap.fetch(results, { bodies: '' });
          const parsePromises: Promise<ParsedMail>[] = [];

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              const promise = simpleParser(stream as any)
                .then((parsed) => {
                  emails.push(parsed);
                  return parsed;
                })
                .catch((error) => {
                  this.logger.error(`Failed to parse email: ${error.message}`);
                  throw error;
                });
              parsePromises.push(promise);
            });
          });

          fetch.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });

          fetch.once('end', async () => {
            clearTimeout(timeout);

            // Wait for all emails to be parsed
            await Promise.allSettled(parsePromises);

            // Mark as read
            if (results.length > 0) {
              imap.addFlags(results, ['\\Seen'], (err) => {
                if (err)
                  this.logger.error(`Failed to mark as read: ${err.message}`);
              });
            }

            resolve(emails);
          });
        });
      });
    });
  }

  private async processEmailWithRetry(
    email: ParsedMail,
    config: EmailConfig,
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.processEmail(email, config);
        return; // Success
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Email processing attempt ${attempt}/${this.maxRetries} failed: ${error.message}`,
        );

        if (attempt < this.maxRetries) {
          await this.sleep(1000); // 1 second between retries
        }
      }
    }

    throw new Error(
      `Failed to process email after ${this.maxRetries} attempts: ${lastError?.message}`,
    );
  }

  private async processEmail(email: ParsedMail, config: EmailConfig) {
    // Validate email
    if (!email.messageId) {
      throw new Error('Email missing messageId');
    }

    // Check if already processed (idempotency)
    const existing = await this.prisma.emailTicketMapping.findUnique({
      where: { emailId: email.messageId },
    });

    if (existing) {
      this.logger.debug(`Email ${email.messageId} already processed, skipping`);
      return;
    }

    // Check if reply to existing thread
    const threadId = this.extractThreadId(email);
    const existingThread = threadId
      ? await this.prisma.emailTicketMapping.findFirst({
          where: { threadId },
          include: { ticket: true },
        })
      : null;

    if (existingThread) {
      await this.addMessageToTicket(existingThread.ticket, email);
    } else {
      await this.createTicketFromEmail(email, config);
    }
  }

  private async createTicketFromEmail(email: ParsedMail, config: EmailConfig) {
    const fromEmail = email.from?.value[0]?.address || 'unknown@email.com';
    const fromName = email.from?.value[0]?.name || fromEmail.split('@')[0];
    const subject = email.subject || 'Sem assunto';
    const body = this.cleanEmailBody(email.text || email.html || '');

    // Validate data
    if (body.length === 0) {
      throw new Error('Email body is empty');
    }

    // Find or create contact
    let contact = await this.prisma.contact.findFirst({
      where: { email: fromEmail },
    });

    if (!contact) {
      contact = await this.contactsService.create({
        jid: `email-${fromEmail}`,
        phoneNumber: 'email-only',
        name: fromName,
        sector: (config.defaultSector || 'TI') as Sector,
      } as any);
    }

    // Create ticket
    const ticket = await this.ticketsService.create({
      title: subject,
      description: body,
      phoneNumber: contact.phoneNumber || 'email-only',
      customerName: contact.name,
      sector: (config.defaultSector || 'TI') as Sector,
      category: 'Email',
      priority: config.defaultPriority as any || 'NORMAL',
    });

    // Create mapping
    await this.prisma.emailTicketMapping.create({
      data: {
        ticketId: ticket.id,
        emailId: email.messageId || `email-${Date.now()}`,
        threadId: this.extractThreadId(email) || email.messageId,
        fromEmail,
        toEmail: config.imapUser,
        subject,
      },
    });

    this.logger.log(
      `✅ Ticket created from email: ${ticket.id} | Subject: "${subject}" | From: ${fromEmail}`,
    );

    return ticket;
  }

  private async addMessageToTicket(ticket: any, email: ParsedMail) {
    const body = this.cleanEmailBody(email.text || email.html || '');

    if (body.length === 0) {
      this.logger.warn('Email reply has empty body, skipping');
      return;
    }

    await this.prisma.message.create({
      data: {
        ticketId: ticket.id,
        content: body,
        direction: 'INCOMING',
        type: 'TEXT',
        isInternal: false,
      },
    });

    this.logger.log(`📨 Message added to ticket ${ticket.id} from email reply`);
  }

  private extractThreadId(email: ParsedMail): string | null {
    return email.inReplyTo || (email.references && email.references[0]) || null;
  }

  private cleanEmailBody(body: string): string {
    if (!body) return '';

    // Remove HTML tags
    let cleaned = body.replace(/<[^>]*>/g, '');

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove email signatures (common patterns)
    cleaned = cleaned.split(/---+|___+|Sent from my/)[0].trim();

    // Limit size (5KB)
    cleaned = cleaned.substring(0, 5000);

    return cleaned;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Circuit Breaker Methods
  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) return false;

    // Check if circuit should reset
    if (
      this.circuitOpenUntil &&
      new Date() >= this.circuitOpenUntil
    ) {
      this.logger.log('🔄 Circuit breaker reset - attempting recovery');
      this.circuitOpen = false;
      this.circuitOpenUntil = null;
      this.failureCount = 0;
      return false;
    }

    return true;
  }

  private onSuccess() {
    this.failureCount = 0;
    this.lastSuccessfulPoll = new Date();

    if (this.circuitOpen) {
      this.logger.log('✅ Circuit breaker CLOSED - service recovered');
      this.circuitOpen = false;
      this.circuitOpenUntil = null;
    }
  }

  private onFailure(error: Error) {
    this.failureCount++;
    this.totalErrors++;

    if (this.failureCount >= this.maxFailures && !this.circuitOpen) {
      this.circuitOpen = true;
      this.circuitOpenUntil = new Date(Date.now() + this.circuitResetTime);

      this.logger.error(
        `⚡ CIRCUIT BREAKER OPENED after ${this.failureCount} failures. ` +
        `Will retry at ${this.circuitOpenUntil.toISOString()}`,
      );

      // TODO: Send alert to admin
    }
  }
}
