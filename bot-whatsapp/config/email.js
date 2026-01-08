const nodemailer = require('nodemailer');

// Configuração do transporte de e-mail
const emailConfig = {
  // Configurações do servidor SMTP
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true' || false, // true para SSL, false para STARTTLS
  
  // Credenciais de autenticação
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  
  // Remetente padrão
  from: process.env.EMAIL_FROM || 'bot@empresa.com',
  
  // Destinatários administradores (para notificações críticas)
  adminEmails: process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : []
};

// Criar transporte de e-mail
const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: emailConfig.auth
});

// Verificar configuração do transporte
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️ Erro na configuração de e-mail:', error);
  } else {
    console.log('✅ Configuração de e-mail verificada com sucesso');
  }
});

// Função para enviar e-mail
const sendEmail = async (to, subject, text, html = null) => {
  // Se o sistema de e-mail estiver desabilitado, não envia
  if (process.env.EMAIL_ENABLED === 'false') {
    console.log('📭 Sistema de e-mail desabilitado. Pulando envio de e-mail.');
    return { success: false, message: 'Sistema de e-mail desabilitado' };
  }

  // Se não tem configuração de e-mail, não envia
  if (!process.env.SMTP_HOST) {
    console.log('📭 Servidor de e-mail não configurado. Pulando envio de e-mail.');
    return { success: false, message: 'Servidor de e-mail não configurado' };
  }

  try {
    const mailOptions = {
      from: emailConfig.from,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      text: text,
      html: html || undefined
    };

    // Se não tem autenticação, não envia
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.log('📭 Credenciais de e-mail não configuradas. Pulando envio de e-mail.');
      return { success: false, message: 'Credenciais de e-mail não configuradas' };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 E-mail enviado com sucesso:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error.message);
    return { success: false, error: error.message };
  }
};

// Função para enviar notificação administrativa
const sendAdminNotification = async (subject, text, html = null) => {
  // Se o sistema de e-mail estiver desabilitado, não envia
  if (process.env.EMAIL_ENABLED === 'false') {
    console.log('📭 Sistema de e-mail desabilitado. Pulando envio de notificação administrativa.');
    return { success: false, message: 'Sistema de e-mail desabilitado' };
  }

  if (emailConfig.adminEmails.length === 0) {
    console.log('⚠️ Nenhum e-mail administrativo configurado');
    return { success: false, error: 'Nenhum destinatário administrativo configurado' };
  }

  return await sendEmail(emailConfig.adminEmails, subject, text, html);
};

// Templates de e-mail
const emailTemplates = {
  // Notificação de nova OS criada
  newOrder: (order) => ({
    subject: `Nova OS #${order.id} - ${order.usuario_nome}`,
    text: `Nova Ordem de Serviço criada:
      
ID: ${order.id}
Usuário: ${order.usuario_nome}
Telefone: ${order.usuario_telefone}
Local: ${order.local_atendimento || 'Não informado'}
Equipamento: ${order.equipamento || 'Não informado'}
Problema: ${order.problema}

Data: ${new Date(order.created_at).toLocaleString('pt-BR')}`,
    html: `
      <h2>Nova Ordem de Serviço Criada</h2>
      <p><strong>ID:</strong> ${order.id}</p>
      <p><strong>Usuário:</strong> ${order.usuario_nome}</p>
      <p><strong>Telefone:</strong> ${order.usuario_telefone}</p>
      <p><strong>Local:</strong> ${order.local_atendimento || 'Não informado'}</p>
      <p><strong>Equipamento:</strong> ${order.equipamento || 'Não informado'}</p>
      <p><strong>Problema:</strong> ${order.problema}</p>
      <p><strong>Data:</strong> ${new Date(order.created_at).toLocaleString('pt-BR')}</p>
    `
  }),

  // Notificação de OS finalizada
  orderCompleted: (order) => ({
    subject: `OS #${order.id} Finalizada - ${order.usuario_nome}`,
    text: `Ordem de Serviço finalizada:
      
ID: ${order.id}
Usuário: ${order.usuario_nome}
Técnico: ${order.tecnico_responsavel || 'Não atribuído'}
Problema: ${order.problema}
Status: Finalizada

Data: ${new Date(order.finalizada_at).toLocaleString('pt-BR')}`,
    html: `
      <h2>Ordem de Serviço Finalizada</h2>
      <p><strong>ID:</strong> ${order.id}</p>
      <p><strong>Usuário:</strong> ${order.usuario_nome}</p>
      <p><strong>Técnico:</strong> ${order.tecnico_responsavel || 'Não atribuído'}</p>
      <p><strong>Problema:</strong> ${order.problema}</p>
      <p><strong>Status:</strong> Finalizada</p>
      <p><strong>Data:</strong> ${new Date(order.finalizada_at).toLocaleString('pt-BR')}</p>
    `
  }),

  // Notificação de backup criado
  backupCreated: (backupInfo) => ({
    subject: `Backup do Sistema Criado - ${new Date().toLocaleDateString('pt-BR')}`,
    text: `Novo backup do sistema criado com sucesso:
      
Nome: ${backupInfo.backupName}
Tamanho: ${backupInfo.size} MB
Tipo: ${backupInfo.type}

Data: ${new Date().toLocaleString('pt-BR')}`,
    html: `
      <h2>Backup do Sistema Criado</h2>
      <p><strong>Nome:</strong> ${backupInfo.backupName}</p>
      <p><strong>Tamanho:</strong> ${backupInfo.size} MB</p>
      <p><strong>Tipo:</strong> ${backupInfo.type}</p>
      <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    `
  }),

  // Notificação de erro crítico
  criticalError: (errorInfo) => ({
    subject: `Erro Crítico no Sistema - ${new Date().toLocaleDateString('pt-BR')}`,
    text: `Erro crítico detectado no sistema:
      
Mensagem: ${errorInfo.message}
Contexto: ${errorInfo.context || 'Não especificado'}
Stack: ${errorInfo.stack || 'Não disponível'}

Data: ${new Date().toLocaleString('pt-BR')}`,
    html: `
      <h2 style="color: red;">Erro Crítico no Sistema</h2>
      <p><strong>Mensagem:</strong> ${errorInfo.message}</p>
      <p><strong>Contexto:</strong> ${errorInfo.context || 'Não especificado'}</p>
      <p><strong>Stack:</strong></p>
      <pre>${errorInfo.stack || 'Não disponível'}</pre>
      <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
    `
  })
};

module.exports = {
  emailConfig,
  sendEmail,
  sendAdminNotification,
  emailTemplates
};
