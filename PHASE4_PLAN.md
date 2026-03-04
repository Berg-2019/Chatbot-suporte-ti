# 🎯 Fase 4 - Canais & Knowledge | Plano de Implementação

> **Status:** ⏳ Em planejamento
> **Data Início:** 2026-03-04
> **Duração Estimada:** 2 semanas
> **Branch:** `feature/chatbot-upgrade`

---

## 📋 Resumo Executivo

A Fase 4 expande os canais de atendimento e cria uma base de conhecimento robusta:
- **Email-to-Ticket**: Converter emails em tickets automaticamente
- **Knowledge Base**: Wiki interno + Help Center público
- **Busca FAQ Inteligente**: Sugestões automáticas de artigos
- **Server Logs**: Visualização de logs do servidor no admin

---

## 🎯 Feature 1/4: Email-to-Ticket (IMAP)

**Origem:** Chatwoot + Peppermint
**Prioridade:** ⭐⭐ Alta
**Esforço:** Alto (~6h)
**Impacto:** Permite atendimento via email, expandindo canais

### 📦 Dependências NPM

```bash
npm install imap mailparser
npm install --save-dev @types/imap @types/mailparser
```

### 🗄️ Database Schema

```prisma
// Já existe no schema atual
model EmailConfig {
  id        String   @id @default(uuid())

  // IMAP Configuration
  imapHost     String
  imapPort     Int      @default(993)
  imapUser     String
  imapPassword String   // Encrypted
  imapTls      Boolean  @default(true)

  // SMTP Configuration (para respostas)
  smtpHost     String?
  smtpPort     Int?     @default(587)
  smtpUser     String?
  smtpPassword String?  // Encrypted
  smtpTls      Boolean  @default(true)

  // Settings
  enabled      Boolean  @default(false)
  pollInterval Int      @default(60)  // seconds
  autoAssign   Boolean  @default(true)

  // Auto-categorization
  defaultPriority String  @default("NORMAL")
  defaultSector   String?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("email_configs")
}

model EmailTicketMapping {
  id            String   @id @default(uuid())
  ticketId      String
  ticket        Ticket   @relation(fields: [ticketId], references: [id])

  emailId       String   @unique  // Message-ID do email
  threadId      String?             // Para agrupar conversas
  fromEmail     String
  toEmail       String
  subject       String

  createdAt     DateTime @default(now())

  @@index([emailId])
  @@index([threadId])
  @@index([ticketId])
  @@map("email_ticket_mappings")
}
```

### 🔧 Backend Implementation

#### 1. Email Ingestion Service

```typescript
// src/infrastructure/email/email-ingestion.service.ts
import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TicketsService } from '../../presentation/controllers/tickets/tickets.service';
import { AutoAssignmentService } from '../../presentation/controllers/auto-assignment/auto-assignment.service';

@Injectable()
export class EmailIngestionService implements OnModuleInit {
  private readonly logger = new Logger(EmailIngestionService.name);
  private imap: Imap | null = null;
  private pollIntervalId: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private ticketsService: TicketsService,
    private autoAssignmentService: AutoAssignmentService,
  ) {}

  async onModuleInit() {
    // Iniciar listener se configuração existir e estiver habilitada
    const config = await this.getConfig();
    if (config?.enabled) {
      await this.startListening();
    }
  }

  async getConfig() {
    return this.prisma.emailConfig.findFirst();
  }

  async startListening() {
    const config = await this.getConfig();
    if (!config || !config.enabled) {
      this.logger.warn('Email ingestion is disabled');
      return;
    }

    this.logger.log('Starting email ingestion service...');

    // Configurar IMAP
    this.imap = new Imap({
      user: config.imapUser,
      password: this.decryptPassword(config.imapPassword),
      host: config.imapHost,
      port: config.imapPort,
      tls: config.imapTls,
      tlsOptions: { rejectUnauthorized: false },
      keepalive: true,
    });

    // Polling a cada X segundos
    this.pollIntervalId = setInterval(() => {
      this.processNewEmails();
    }, config.pollInterval * 1000);

    // Processar imediatamente na inicialização
    await this.processNewEmails();

    this.logger.log(`Email polling started (every ${config.pollInterval}s)`);
  }

  async stopListening() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    if (this.imap) {
      this.imap.end();
      this.imap = null;
    }
    this.logger.log('Email ingestion service stopped');
  }

  private async processNewEmails() {
    try {
      const config = await this.getConfig();
      if (!config) return;

      const connection = await this.connectImap(config);
      const emails = await this.fetchUnreadEmails(connection);

      for (const email of emails) {
        try {
          await this.processEmail(email, config);
        } catch (error) {
          this.logger.error(`Failed to process email: ${error.message}`);
        }
      }

      connection.end();
    } catch (error) {
      this.logger.error(`Email processing failed: ${error.message}`);
    }
  }

  private connectImap(config: any): Promise<Imap> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: config.imapUser,
        password: this.decryptPassword(config.imapPassword),
        host: config.imapHost,
        port: config.imapPort,
        tls: config.imapTls,
      });

      imap.once('ready', () => resolve(imap));
      imap.once('error', reject);
      imap.connect();
    });
  }

  private async fetchUnreadEmails(imap: Imap): Promise<ParsedMail[]> {
    return new Promise((resolve, reject) => {
      imap.openBox('INBOX', false, (err) => {
        if (err) return reject(err);

        // Buscar emails não lidos
        imap.search(['UNSEEN'], (err, results) => {
          if (err) return reject(err);
          if (!results || results.length === 0) return resolve([]);

          const fetch = imap.fetch(results, { bodies: '' });
          const emails: ParsedMail[] = [];

          fetch.on('message', (msg) => {
            msg.on('body', async (stream) => {
              const parsed = await simpleParser(stream);
              emails.push(parsed);
            });
          });

          fetch.once('error', reject);
          fetch.once('end', () => resolve(emails));
        });
      });
    });
  }

  private async processEmail(email: ParsedMail, config: any) {
    // Verificar se já foi processado
    const existing = await this.prisma.emailTicketMapping.findUnique({
      where: { emailId: email.messageId },
    });

    if (existing) {
      this.logger.debug(`Email ${email.messageId} already processed`);
      return;
    }

    // Verificar se é resposta a um ticket existente
    const threadId = this.extractThreadId(email);
    const existingThread = threadId
      ? await this.prisma.emailTicketMapping.findFirst({
          where: { threadId },
          include: { ticket: true },
        })
      : null;

    if (existingThread) {
      // Adicionar mensagem ao ticket existente
      await this.addMessageToTicket(existingThread.ticket, email);
    } else {
      // Criar novo ticket
      await this.createTicketFromEmail(email, config);
    }

    // Marcar email como lido
    // (implementar se necessário)
  }

  private async createTicketFromEmail(email: ParsedMail, config: any) {
    // Extrair informações do email
    const fromEmail = email.from?.value[0]?.address || 'unknown@email.com';
    const fromName = email.from?.value[0]?.name || fromEmail.split('@')[0];
    const subject = email.subject || 'Sem assunto';
    const body = email.text || email.html || '';

    // Buscar ou criar contato
    let contact = await this.prisma.contact.findFirst({
      where: { email: fromEmail },
    });

    if (!contact) {
      contact = await this.prisma.contact.create({
        data: {
          name: fromName,
          phone: 'email-only', // Placeholder
          email: fromEmail,
          jid: null,
        },
      });
    }

    // Criar ticket
    const ticket = await this.ticketsService.create({
      customerName: contact.name,
      phoneNumber: contact.phone,
      email: fromEmail,
      sector: config.defaultSector || 'TI',
      description: this.cleanEmailBody(body),
      category: 'Email',
      priority: config.defaultPriority || 'NORMAL',
      source: 'email',
    });

    // Criar mapeamento
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

    // Auto-atribuir se configurado
    if (config.autoAssign) {
      await this.autoAssignmentService.autoAssignTicket(ticket.id);
    }

    this.logger.log(`Ticket ${ticket.id} created from email ${email.messageId}`);

    // Enviar confirmação por email (opcional)
    if (config.smtpHost) {
      await this.sendConfirmationEmail(fromEmail, ticket, config);
    }

    return ticket;
  }

  private async addMessageToTicket(ticket: any, email: ParsedMail) {
    const fromEmail = email.from?.value[0]?.address || 'unknown@email.com';
    const body = email.text || email.html || '';

    // Adicionar mensagem como nota interna ou mensagem do cliente
    await this.prisma.message.create({
      data: {
        ticketId: ticket.id,
        content: this.cleanEmailBody(body),
        direction: 'INCOMING',
        channel: 'email',
        isInternal: false,
        // contactId: ... (buscar pelo email)
      },
    });

    this.logger.log(`Message added to ticket ${ticket.id} from email`);
  }

  private async sendConfirmationEmail(toEmail: string, ticket: any, config: any) {
    // Implementar envio via nodemailer
    // "Seu ticket #${ticket.id} foi criado com sucesso"
    this.logger.debug(`Confirmation email sent to ${toEmail}`);
  }

  private extractThreadId(email: ParsedMail): string | null {
    // Extrair In-Reply-To ou References header
    return email.inReplyTo || email.references?.[0] || null;
  }

  private cleanEmailBody(body: string): string {
    // Remover assinaturas, disclaimers, HTML tags
    let cleaned = body.replace(/<[^>]*>/g, ''); // Strip HTML
    cleaned = cleaned.substring(0, 5000); // Limitar tamanho
    return cleaned.trim();
  }

  private decryptPassword(encrypted: string): string {
    // Implementar decriptação se necessário
    // Por enquanto, retornar direto (em produção, usar crypto)
    return encrypted;
  }
}
```

#### 2. Email Config Controller

```typescript
// src/presentation/controllers/email-config/email-config.controller.ts
import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { EmailConfigService } from './email-config.service';

@Controller('email-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailConfigController {
  constructor(private emailConfigService: EmailConfigService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async getConfig() {
    return this.emailConfigService.getConfig();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async createConfig(@Body() dto: CreateEmailConfigDto) {
    return this.emailConfigService.create(dto);
  }

  @Put()
  @Roles(UserRole.ADMIN)
  async updateConfig(@Body() dto: UpdateEmailConfigDto) {
    return this.emailConfigService.update(dto);
  }

  @Post('test-connection')
  @Roles(UserRole.ADMIN)
  async testConnection() {
    return this.emailConfigService.testConnection();
  }

  @Post('start')
  @Roles(UserRole.ADMIN)
  async startService() {
    return this.emailConfigService.startIngestion();
  }

  @Post('stop')
  @Roles(UserRole.ADMIN)
  async stopService() {
    return this.emailConfigService.stopIngestion();
  }
}
```

### 📊 Endpoints

```
GET    /email-config              - Buscar configuração
POST   /email-config              - Criar configuração
PUT    /email-config              - Atualizar configuração
POST   /email-config/test-connection  - Testar conexão IMAP
POST   /email-config/start        - Iniciar ingestão
POST   /email-config/stop         - Parar ingestão
```

### ✅ Checklist

- [ ] Instalar dependências (imap, mailparser)
- [ ] Criar models EmailConfig e EmailTicketMapping
- [ ] Criar migration
- [ ] Implementar EmailIngestionService
- [ ] Implementar EmailConfigService
- [ ] Criar EmailConfigController
- [ ] Implementar resposta por email (SMTP)
- [ ] Testar com Gmail/Outlook
- [ ] Frontend de configuração (admin)
- [ ] Documentação de setup

---

## 🎯 Feature 2/4: Knowledge Base / Wiki Interno

**Origem:** Peppermint + Chatwoot
**Prioridade:** ⭐⭐ Média
**Esforço:** Médio (~4h)
**Impacto:** Base de conhecimento para técnicos e clientes

### 🗄️ Database Schema

```prisma
// Já existe no schema (from Fase 1)
model KnowledgeArticle {
  id          String   @id @default(uuid())
  title       String
  content     String   @db.Text  // Markdown
  summary     String?              // Preview text

  category    String   // "Procedimentos", "Troubleshooting", "Onboarding"

  isPublic    Boolean  @default(false) // Help Center público
  isInternal  Boolean  @default(true)  // Wiki interno

  tags        String[]

  authorId    String
  author      User     @relation(fields: [authorId], references: [id])

  views       Int      @default(0)
  helpful     Int      @default(0)    // Contagem de "útil"
  notHelpful  Int      @default(0)    // Contagem de "não útil"

  // SEO
  slug        String   @unique
  metaDescription String?

  // Publishing
  status      String   @default("draft")  // draft, published, archived
  publishedAt DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category])
  @@index([isPublic])
  @@index([status])
  @@index([tags])
  @@index([slug])
  @@map("knowledge_articles")
}

model ArticleFeedback {
  id         String   @id @default(uuid())
  articleId  String
  article    KnowledgeArticle @relation(fields: [articleId], references: [id])

  userId     String?
  user       User?    @relation(fields: [userId], references: [id])

  helpful    Boolean  // true = helpful, false = not helpful
  comment    String?

  createdAt  DateTime @default(now())

  @@index([articleId])
  @@map("article_feedback")
}
```

### 🔧 Backend Implementation

```typescript
// src/presentation/controllers/knowledge/knowledge.service.ts
@Injectable()
export class KnowledgeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateArticleDto, authorId: string) {
    const slug = this.generateSlug(dto.title);

    return this.prisma.knowledgeArticle.create({
      data: {
        ...dto,
        slug,
        authorId,
      },
    });
  }

  async findAll(filters: ArticleQueryDto) {
    const where: any = {};

    if (filters.category) where.category = filters.category;
    if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;
    if (filters.status) where.status = filters.status;
    if (filters.tag) where.tags = { has: filters.tag };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
        { summary: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.knowledgeArticle.findMany({
      where,
      include: { author: { select: { name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
      skip: filters.skip || 0,
      take: filters.take || 20,
    });
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { slug },
      include: { author: true },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Incrementar views
    await this.prisma.knowledgeArticle.update({
      where: { id: article.id },
      data: { views: { increment: 1 } },
    });

    return article;
  }

  async markHelpful(articleId: string, userId: string, helpful: boolean) {
    await this.prisma.articleFeedback.create({
      data: { articleId, userId, helpful },
    });

    // Atualizar contador
    await this.prisma.knowledgeArticle.update({
      where: { id: articleId },
      data: helpful
        ? { helpful: { increment: 1 } }
        : { notHelpful: { increment: 1 } },
    });
  }

  async getPopular(limit: number = 10) {
    return this.prisma.knowledgeArticle.findMany({
      where: { status: 'published' },
      orderBy: [{ views: 'desc' }, { helpful: 'desc' }],
      take: limit,
    });
  }

  async getRelated(articleId: string, limit: number = 5) {
    const article = await this.prisma.knowledgeArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) return [];

    // Buscar artigos com tags similares
    return this.prisma.knowledgeArticle.findMany({
      where: {
        id: { not: articleId },
        tags: { hasSome: article.tags },
        status: 'published',
      },
      take: limit,
      orderBy: { views: 'desc' },
    });
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
```

### 📊 Endpoints

```
POST   /knowledge/articles                  - Criar artigo
GET    /knowledge/articles                  - Listar com filtros
GET    /knowledge/articles/popular          - Artigos populares
GET    /knowledge/articles/categories       - Categorias únicas
GET    /knowledge/articles/:slug            - Buscar por slug
GET    /knowledge/articles/:id/related      - Artigos relacionados
PUT    /knowledge/articles/:id              - Atualizar
DELETE /knowledge/articles/:id              - Deletar
POST   /knowledge/articles/:id/feedback     - Marcar helpful/not
POST   /knowledge/articles/:id/publish      - Publicar
```

### ✅ Checklist

- [ ] Criar models (já existem)
- [ ] Implementar KnowledgeService
- [ ] Criar KnowledgeController
- [ ] Editor markdown no frontend (@uiw/react-md-editor)
- [ ] Categorias e tags
- [ ] Sistema de busca
- [ ] Help Center público (opcional)
- [ ] Estatísticas de uso

---

## 🎯 Feature 3/4: Busca FAQ Inteligente

**Origem:** Chatwoot + Rasa concept
**Prioridade:** ⭐⭐ Média
**Esforço:** Médio (~3h)
**Impacto:** Sugestões automáticas de artigos para técnicos

### 🔧 Implementation

```typescript
// src/presentation/controllers/knowledge/knowledge-search.service.ts
@Injectable()
export class KnowledgeSearchService {
  constructor(
    private prisma: PrismaService,
    private intentService: IntentService, // Da Fase 3
  ) {}

  /**
   * Busca semântica de artigos baseado em mensagem do ticket
   */
  async suggestArticles(ticketMessage: string, limit: number = 5) {
    // 1. Classificar intenção da mensagem
    const classification = await this.intentService.classify(ticketMessage, '');

    // 2. Buscar artigos por keywords extraídas
    const keywords = this.extractKeywords(ticketMessage);
    const articles = await this.searchByKeywords(keywords, limit);

    // 3. Filtrar por categoria baseado na intenção
    const categoryMap = {
      abrir_ticket_ti: 'Troubleshooting',
      abrir_ticket_eletrica: 'Manutenção',
      reservar_equipamento: 'Procedimentos',
    };

    const category = categoryMap[classification.intent];
    if (category) {
      return articles.filter(a => a.category === category);
    }

    return articles;
  }

  private async searchByKeywords(keywords: string[], limit: number) {
    if (keywords.length === 0) return [];

    return this.prisma.knowledgeArticle.findMany({
      where: {
        status: 'published',
        OR: keywords.map(keyword => ({
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { content: { contains: keyword, mode: 'insensitive' } },
            { tags: { has: keyword } },
          ],
        })),
      },
      orderBy: [{ helpful: 'desc' }, { views: 'desc' }],
      take: limit,
    });
  }

  private extractKeywords(text: string): string[] {
    // Remover stopwords e extrair palavras-chave
    const stopwords = ['o', 'a', 'de', 'da', 'do', 'em', 'é', 'que', 'para', 'com', 'não', 'um', 'uma'];

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopwords.includes(word))
      .slice(0, 10); // Top 10 keywords
  }
}
```

### 📊 Endpoints

```
POST   /knowledge/search/suggest      - Sugerir artigos baseado em texto
GET    /knowledge/search?q=termo      - Busca tradicional
POST   /knowledge/search/similar      - Artigos similares por conteúdo
```

### ✅ Checklist

- [ ] Implementar KnowledgeSearchService
- [ ] Integrar com IntentService
- [ ] Extração de keywords
- [ ] Sugestões automáticas no ChatView
- [ ] Cache de sugestões
- [ ] Teste com casos reais

---

## 🎯 Feature 4/4: Server Logs no Admin

**Origem:** Peppermint
**Prioridade:** ⭐ Baixa
**Esforço:** Baixo (~1h)
**Impacto:** Debug facilitado para admins

### 🔧 Implementation

```typescript
// src/presentation/controllers/admin/logs.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

const execAsync = promisify(exec);

@Controller('admin/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogsController {
  @Get()
  @Roles(UserRole.ADMIN)
  async getLogs(
    @Query('lines') lines: string = '500',
    @Query('level') level?: string, // ERROR, WARN, INFO, DEBUG
  ) {
    const linesNum = Math.min(parseInt(lines), 1000); // Max 1000 linhas

    // Ler do arquivo de log do NestJS
    const logPath = process.env.LOG_FILE_PATH || '/var/log/helpdesk/app.log';

    try {
      let command = `tail -n ${linesNum} ${logPath}`;

      if (level) {
        command += ` | grep "${level}"`;
      }

      const { stdout } = await execAsync(command);

      const logLines = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => this.parseLogLine(line));

      return {
        total: logLines.length,
        logs: logLines,
      };
    } catch (error) {
      return {
        error: 'Failed to read logs',
        message: error.message,
      };
    }
  }

  @Get('download')
  @Roles(UserRole.ADMIN)
  async downloadLogs() {
    // Retornar arquivo de log completo para download
    const logPath = process.env.LOG_FILE_PATH || '/var/log/helpdesk/app.log';
    return { downloadUrl: `/files/logs/app.log` };
  }

  private parseLogLine(line: string) {
    // Tentar parsear linha de log JSON
    try {
      return JSON.parse(line);
    } catch {
      // Se não for JSON, retornar como texto
      return { message: line, timestamp: new Date().toISOString() };
    }
  }
}
```

### 📊 Endpoints

```
GET    /admin/logs?lines=500&level=ERROR   - Buscar logs
GET    /admin/logs/download                - Download completo
```

### ✅ Checklist

- [ ] Criar LogsController
- [ ] Configurar logging estruturado (Winston)
- [ ] Frontend LogViewer component
- [ ] Auto-refresh a cada 10s
- [ ] Filtro por nível
- [ ] Download de logs

---

## 📊 Estimativas Gerais

### Tempo por Feature

| Feature | Backend | Frontend | Testes | Total |
|---------|---------|----------|--------|-------|
| Email-to-Ticket | 4h | 2h | 1h | 7h |
| Knowledge Base | 3h | 3h | 1h | 7h |
| Busca FAQ | 2h | 2h | 1h | 5h |
| Server Logs | 0.5h | 1h | 0.5h | 2h |
| **Total** | **9.5h** | **8h** | **3.5h** | **21h** |

### Linhas de Código Estimadas

| Feature | Backend | Frontend | Total |
|---------|---------|----------|-------|
| Email-to-Ticket | ~1.000 | ~400 | ~1.400 |
| Knowledge Base | ~800 | ~600 | ~1.400 |
| Busca FAQ | ~400 | ~300 | ~700 |
| Server Logs | ~200 | ~300 | ~500 |
| **Total** | **~2.400** | **~1.600** | **~4.000** |

---

## 🗓️ Cronograma

### Semana 1

**Dia 1-2:** Email-to-Ticket
- Backend EmailIngestionService
- EmailConfigController
- Testes IMAP

**Dia 3-4:** Knowledge Base
- KnowledgeService completo
- Frontend editor markdown
- Categorias e tags

**Dia 5:** Busca FAQ Inteligente
- KnowledgeSearchService
- Integração com Intent Detection

### Semana 2

**Dia 1:** Server Logs
- LogsController
- Frontend LogViewer

**Dia 2-3:** Frontend Completo
- EmailConfigView
- KnowledgeArticlesView
- LogsView

**Dia 4-5:** Testes e Documentação
- Testes E2E
- Documentação completa
- Commit final

---

## 📝 Notas Técnicas

### Segurança

- Senhas de email devem ser encriptadas no banco
- Apenas ADMIN pode configurar email
- Validar emails para evitar spam
- Rate limiting em busca de FAQ

### Performance

- Cache de artigos populares
- Indexação full-text no PostgreSQL
- Polling de email configurável (evitar sobrecarga)

### Compatibilidade

- Testar com Gmail, Outlook, ProtonMail
- Suporte a IMAP com TLS
- Parser de HTML/Plain text emails

---

**Próximos Passos:**
1. Instalar dependências
2. Criar migrations
3. Implementar Feature 1 (Email-to-Ticket)
4. Implementar Feature 2 (Knowledge Base)
5. Implementar Feature 3 (Busca FAQ)
6. Implementar Feature 4 (Server Logs)
7. Frontend completo
8. Testes
9. Documentação
10. Commit e PR

---

**Autor:** Claude (Anthropic)
**Data:** 2026-03-04
**Branch:** feature/chatbot-upgrade
