const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configuração do banco de dados
const dbPath = path.join(__dirname, 'db', 'atendimento.db');

// Criar diretório se não existir
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log('🗄️  Inicializando banco de dados...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar com o banco:', err);
    process.exit(1);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite.');
    initializeTables();
  }
});

function initializeTables() {
  console.log('📋 Criando tabelas...');

  // Tabela de Ordens de Serviço
  db.run(`
    CREATE TABLE IF NOT EXISTS ordens_servico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_nome TEXT NOT NULL,
      usuario_telefone TEXT NOT NULL,
      local_atendimento TEXT,
      equipamento TEXT,
      anydesk TEXT,
      problema TEXT NOT NULL,
      status TEXT DEFAULT 'aberta',
      tecnico_responsavel TEXT,
      prioridade INTEGER DEFAULT 0,
      setor TEXT DEFAULT 'TI',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finalizada_at DATETIME
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela ordens_servico:', err);
    } else {
      console.log('✅ Tabela ordens_servico criada');
    }
  });

  // Tabela de Usuários e Permissões
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telefone TEXT UNIQUE NOT NULL,
      nome TEXT,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela usuarios:', err);
    } else {
      console.log('✅ Tabela usuarios criada');
    }
  });

  // Tabela de Histórico de Mensagens
  db.run(`
    CREATE TABLE IF NOT EXISTS historico_mensagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id INTEGER,
      usuario_telefone TEXT,
      mensagem TEXT,
      tipo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ordem_id) REFERENCES ordens_servico (id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela historico_mensagens:', err);
    } else {
      console.log('✅ Tabela historico_mensagens criada');
    }
  });

  // Tabela de Configurações
  db.run(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela configuracoes:', err);
    } else {
      console.log('✅ Tabela configuracoes criada');
    }
  });

  // Tabela de Usuários de Sistema (para login web)
  db.run(`
    CREATE TABLE IF NOT EXISTS system_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      telefone TEXT,
      role TEXT DEFAULT 'admin',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela system_users:', err);
    } else {
      console.log('✅ Tabela system_users criada');
    }
  });

  // Tabela de Configurações do Sistema
  db.run(`
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT UNIQUE NOT NULL,
      config_value TEXT,
      description TEXT,
      updated_by TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela system_config:', err);
    } else {
      console.log('✅ Tabela system_config criada');
    }
  });

  // Tabela de Backups
  db.run(`
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_name TEXT NOT NULL,
      backup_path TEXT NOT NULL,
      backup_size INTEGER,
      backup_type TEXT DEFAULT 'auto',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'completed'
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela backups:', err);
    } else {
      console.log('✅ Tabela backups criada');
    }
  });

  // Tabela de Solicitações de Peças
  db.run(`
    CREATE TABLE IF NOT EXISTS solicitacoes_pecas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id INTEGER NOT NULL,
      tecnico_telefone TEXT NOT NULL,
      tecnico_nome TEXT,
      pecas_solicitadas TEXT NOT NULL,
      observacoes TEXT,
      status TEXT DEFAULT 'pendente',
      almoxarifado_responsavel TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      atendida_at DATETIME,
      FOREIGN KEY (ordem_id) REFERENCES ordens_servico (id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela solicitacoes_pecas:', err);
    } else {
      console.log('✅ Tabela solicitacoes_pecas criada');
      insertSampleData();
    }
  });
}

function insertSampleData() {
  console.log('📝 Inserindo dados de exemplo...');

  // Inserir usuários root
  const rootNumbers = ['556981170027', '556884268042', '5569981170027'];
  rootNumbers.forEach(numero => {
    db.run(`
      INSERT OR IGNORE INTO usuarios (telefone, nome, role) 
      VALUES (?, 'Root User', 'root')
    `, [numero], (err) => {
      if (err) {
        console.error('❌ Erro ao inserir usuário root:', err);
      }
    });
  });

  // Inserir técnicos de exemplo
  const tecnicos = [
    { telefone: '69999111222', nome: 'João Silva', role: 'tecnico' },
    { telefone: '69999333444', nome: 'Maria Santos', role: 'tecnico' },
    { telefone: '69999555666', nome: 'Pedro Costa', role: 'admin' }
  ];

  tecnicos.forEach(tecnico => {
    db.run(`
      INSERT OR IGNORE INTO usuarios (telefone, nome, role) 
      VALUES (?, ?, ?)
    `, [tecnico.telefone, tecnico.nome, tecnico.role], (err) => {
      if (err) {
        console.error('❌ Erro ao inserir técnico:', err);
      }
    });
  });

  // Inserir ordens de serviço de exemplo
  const ordensExemplo = [
    {
      usuario_nome: 'Ana Oliveira',
      usuario_telefone: '69988776655',
      local_atendimento: 'Recepção',
      equipamento: 'Impressora HP LaserJet',
      anydesk: '123456789',
      problema: 'Impressora não está imprimindo, papel atolando constantemente',
      status: 'aberta',
      prioridade: 1,
      setor: 'Administrativo'
    },
    {
      usuario_nome: 'Carlos Mendes',
      usuario_telefone: '69987654321',
      local_atendimento: 'Sala 201',
      equipamento: 'Computador Dell',
      anydesk: '987654321',
      problema: 'Computador muito lento, travando frequentemente',
      status: 'em_andamento',
      tecnico_responsavel: 'João Silva',
      prioridade: 0,
      setor: 'TI'
    },
    {
      usuario_nome: 'Fernanda Lima',
      usuario_telefone: '69912345678',
      local_atendimento: 'Financeiro',
      equipamento: 'Monitor Samsung',
      problema: 'Monitor piscando e com listras na tela',
      status: 'aberta',
      prioridade: 0,
      setor: 'Financeiro'
    },
    {
      usuario_nome: 'Roberto Alves',
      usuario_telefone: '69998887777',
      local_atendimento: 'RH',
      equipamento: 'Notebook Lenovo',
      anydesk: '555666777',
      problema: 'Sistema não inicializa, tela azul da morte',
      status: 'finalizada',
      tecnico_responsavel: 'Maria Santos',
      prioridade: 1,
      setor: 'RH',
      finalizada_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 dia atrás
    },
    {
      usuario_nome: 'Lucia Ferreira',
      usuario_telefone: '69911223344',
      local_atendimento: 'Vendas',
      equipamento: 'Telefone IP',
      problema: 'Telefone sem sinal, não consegue fazer ligações',
      status: 'em_andamento',
      tecnico_responsavel: 'Pedro Costa',
      prioridade: 1,
      setor: 'Vendas'
    },
    {
      usuario_nome: 'Marcos Silva',
      usuario_telefone: '69955443322',
      local_atendimento: 'Almoxarifado',
      equipamento: 'Scanner Epson',
      problema: 'Scanner não reconhece documentos, erro de conexão',
      status: 'cancelada',
      prioridade: 0,
      setor: 'Operações'
    }
  ];

  ordensExemplo.forEach((ordem, index) => {
    const createdAt = new Date(Date.now() - (index * 2 * 60 * 60 * 1000)).toISOString(); // Espaçar por 2 horas
    
    db.run(`
      INSERT INTO ordens_servico 
      (usuario_nome, usuario_telefone, local_atendimento, equipamento, anydesk, problema, status, tecnico_responsavel, prioridade, setor, created_at, updated_at, finalizada_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ordem.usuario_nome,
      ordem.usuario_telefone,
      ordem.local_atendimento,
      ordem.equipamento,
      ordem.anydesk || null,
      ordem.problema,
      ordem.status,
      ordem.tecnico_responsavel || null,
      ordem.prioridade,
      ordem.setor,
      createdAt,
      createdAt,
      ordem.finalizada_at || null
    ], function(err) {
      if (err) {
        console.error('❌ Erro ao inserir OS:', err);
      } else {
        console.log(`✅ OS #${this.lastID} criada: ${ordem.usuario_nome}`);
        
        // Inserir histórico para esta OS
        db.run(`
          INSERT INTO historico_mensagens (ordem_id, usuario_telefone, mensagem, tipo, created_at)
          VALUES (?, ?, ?, 'user', ?)
        `, [this.lastID, ordem.usuario_telefone, ordem.problema, createdAt]);
      }
    });
  });

  // Inserir configurações padrão
  const configs = [
    { chave: 'mensagem_saudacao', valor: 'Olá! Sou o assistente técnico. Como posso ajudá-lo hoje?' },
    { chave: 'mensagem_final', valor: 'Atendimento finalizado. Obrigado por utilizar nossos serviços!' },
    { chave: 'dias_limpeza', valor: '7' }
  ];

  configs.forEach(config => {
    db.run(`
      INSERT OR REPLACE INTO configuracoes (chave, valor)
      VALUES (?, ?)
    `, [config.chave, config.valor], (err) => {
      if (err) {
        console.error('❌ Erro ao inserir configuração:', err);
      }
    });
  });

  // Inserir configurações do sistema
  const systemConfigs = [
    ['grupo_tecnico', 'H6Mb8FQAnhaJhY5RdyIKjP@g.us', 'ID do grupo técnico no WhatsApp'],
    ['max_memory', '512MB', 'Limite máximo de uso de memória'],
    ['storage_limit', '2GB', 'Limite de armazenamento'],
    ['backup_path', './backups', 'Caminho para backups'],
    ['export_path', './exports', 'Caminho para exportações'],
    ['backup_interval', '24', 'Intervalo de backup em horas'],
    ['auto_backup', 'true', 'Backup automático habilitado'],
    ['cleanup_days', '365', 'Dias para manter histórico']
  ];

  systemConfigs.forEach(([key, value, description]) => {
    db.run(`
      INSERT OR IGNORE INTO system_config (config_key, config_value, description, updated_by)
      VALUES (?, ?, ?, 'init-script')
    `, [key, value, description], (err) => {
      if (err) {
        console.error('❌ Erro ao inserir configuração do sistema:', err);
      }
    });
  });

  // Criar usuário root padrão para sistema web
  const defaultPassword = 'admin847523'; // Senha padrão
  const rootUser = '5569981170027'; // Número root padrão
  
  db.run(`
    INSERT OR IGNORE INTO system_users (username, password, telefone, role, created_by)
    VALUES (?, ?, ?, 'root', 'init-script')
  `, ['root', defaultPassword, rootUser], (err) => {
    if (err) {
      console.error('❌ Erro ao inserir usuário root do sistema:', err);
    } else {
      console.log('✅ Usuário root do sistema criado');
    }
  });

  setTimeout(() => {
    console.log('\n🎉 Banco de dados inicializado com sucesso!');
    console.log('📊 Dados de exemplo inseridos:');
    console.log('   • 6 Ordens de Serviço');
    console.log('   • 5 Usuários (2 root, 2 técnicos, 1 admin)');
    console.log('   • Configurações padrão');
    console.log('   • Usuário root do sistema');
    console.log('\n🌐 Agora você pode acessar o painel em: http://localhost:8000');
    
    db.close((err) => {
      if (err) {
        console.error('❌ Erro ao fechar banco:', err);
      } else {
        console.log('✅ Conexão com banco fechada.');
      }
      process.exit(0);
    });
  }, 1000);
}

