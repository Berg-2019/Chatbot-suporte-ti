# Configuração de Notificações por E-mail

Este documento explica como configurar as notificações por e-mail no Bot de Atendimento WhatsApp.

## Visão Geral

O bot agora suporta notificações por e-mail para eventos importantes:
- Falhas na notificação do WhatsApp (para roots)
- Criação de novas Ordens de Serviço
- Finalização de Ordens de Serviço
- Criação de backups

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Configurações de e-mail (opcional)
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha
EMAIL_FROM=bot@empresa.com
ADMIN_EMAILS=admin1@empresa.com,admin2@empresa.com
```

### Descrição das Variáveis

- `EMAIL_ENABLED`: true para habilitar notificações por e-mail, false para desabilitar (padrão: true)
- `SMTP_HOST`: Servidor SMTP (ex: smtp.gmail.com, smtp.office365.com)
- `SMTP_PORT`: Porta SMTP (587 para STARTTLS, 465 para SSL)
- `SMTP_SECURE`: true para SSL, false para STARTTLS
- `SMTP_USER`: Nome de usuário para autenticação SMTP
- `SMTP_PASS`: Senha para autenticação SMTP
- `EMAIL_FROM`: Endereço de e-mail do remetente
- `ADMIN_EMAILS`: Lista de e-mails para receber notificações (separados por vírgula)

## Funcionalidades

### Notificações Automáticas

1. **Falhas na Notificação do WhatsApp**
   - Quando o bot não consegue enviar mensagem para o root principal
   - Tenta enviar para roots secundários e notifica por e-mail

2. **Novas Ordens de Serviço**
   - Enviado quando uma nova OS é criada (via IA ou formulário)
   - Inclui detalhes do usuário, problema e data

3. **OS Finalizadas**
   - Enviado quando uma OS é marcada como finalizada
   - Inclui informações do técnico e solução

4. **Backups Criados**
   - Enviado quando um backup é criado (manual ou automático)
   - Inclui nome do arquivo, tamanho e tipo

## Segurança

### Credenciais SMTP

Para serviços como Gmail, é recomendado usar "App Passwords" em vez da senha real:
1. Acesse as configurações de segurança da sua conta Google
2. Habilite a verificação em duas etapas
3. Gere um "App Password" para o bot
4. Use o App Password como `SMTP_PASS`

### Configurações para Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu_email@gmail.com
SMTP_PASS=seu_app_password
```

### Configurações para Outlook/Office365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu_email@empresa.com
SMTP_PASS=sua_senha
```

## Teste de Configuração

Para testar se a configuração está funcionando:

1. Configure as variáveis de ambiente
2. Reinicie o bot
3. Verifique os logs para mensagens de verificação de e-mail
4. Force a criação de uma OS de teste

## Desativação

Se não quiser usar notificações por e-mail:
- Configure `EMAIL_ENABLED=false` no arquivo `.env`
- Ou não configure as variáveis de ambiente SMTP
- O sistema funcionará normalmente sem enviar e-mails

## Solução de Problemas

### Erros Comuns

1. **"SMTP authentication failed"**
   - Verifique usuário e senha
   - Para Gmail, use App Password

2. **"Connection timeout"**
   - Verifique o servidor SMTP e porta
   - Confirme que a porta não está bloqueada pelo firewall

3. **"No recipients defined"**
   - Configure `ADMIN_EMAILS` com pelo menos um e-mail

### Logs

Verifique os logs do bot para mensagens iniciadas com:
- `📧` - E-mail enviado com sucesso
- `📭` - Configuração de e-mail ausente
- `❌` - Erro ao enviar e-mail

## Personalização

Os templates de e-mail podem ser modificados em `bot-whatsapp/config/email.js`:
- `newOrder`: Nova OS criada
- `orderCompleted`: OS finalizada
- `backupCreated`: Backup criado
- `criticalError`: Erro crítico no sistema

Cada template pode ter versões texto e HTML para melhor compatibilidade.
