const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

class Database {
  constructor() {
    this.dbPath = config.database.path;
    this.ensureDirectoryExists();
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Erro ao conectar com o banco de dados:', err.message);
      } else {
        console.log('Conectado ao banco de dados SQLite.');
        this.initializeTables();
      }
    });
  }

  ensureDirectoryExists() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  initializeTables() {
    // Tabela de Ordens de Serviço
    this.db.run(`
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
    `);

    // Tabela de Usuários e Permissões
    this.db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telefone TEXT UNIQUE NOT NULL,
        nome TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Histórico de Mensagens
    this.db.run(`
      CREATE TABLE IF NOT EXISTS historico_mensagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ordem_id INTEGER,
        usuario_telefone TEXT,
        mensagem TEXT,
        tipo TEXT, -- 'user', 'tecnico', 'system'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ordem_id) REFERENCES ordens_servico (id)
      )
    `);

    // Tabela de Configurações
    this.db.run(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Solicitações de Peças
    this.db.run(`
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
    `);

    // Tabela de Usuários de Sistema (para login web)
    this.db.run(`
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
    `);

    // Tabela de Configurações do Sistema
    this.db.run(`
      CREATE TABLE IF NOT EXISTS system_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_key TEXT UNIQUE NOT NULL,
        config_value TEXT,
        description TEXT,
        updated_by TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Backups
    this.db.run(`
      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_name TEXT NOT NULL,
        backup_path TEXT NOT NULL,
        backup_size INTEGER,
        backup_type TEXT DEFAULT 'auto',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'completed'
      )
    `);

    // Inserir usuários root se não existirem
    this.initializeRootUsers();
    this.initializeSystemConfig();
  }

  initializeRootUsers() {
    config.whatsapp.rootNumbers.forEach(numero => {
      this.db.run(`
        INSERT OR IGNORE INTO usuarios (telefone, nome, role) 
        VALUES (?, 'Root User', 'root')
      `, [numero]);
    });

    // Criar usuário root padrão para sistema web
    this.db.run(`
      INSERT OR IGNORE INTO system_users (username, password, telefone, role, created_by)
      VALUES (?, ?, ?, 'root', 'system')
    `, ['root', config.auth.defaultPassword, config.auth.rootUser]);
  }

  initializeSystemConfig() {
    const defaultConfigs = [
      ['grupo_tecnico', config.whatsapp.grupoTecnico, 'ID do grupo técnico no WhatsApp'],
      ['max_memory', config.system.maxMemoryUsage, 'Limite máximo de uso de memória'],
      ['storage_limit', config.system.storageLimit, 'Limite de armazenamento'],
      ['backup_path', config.system.backupPath, 'Caminho para backups'],
      ['export_path', config.system.exportPath, 'Caminho para exportações'],
      ['backup_interval', config.system.backupInterval.toString(), 'Intervalo de backup em horas'],
      ['auto_backup', config.system.enableAutoBackup.toString(), 'Backup automático habilitado'],
      ['cleanup_days', config.cleanup.daysToKeep.toString(), 'Dias para manter histórico']
    ];

    defaultConfigs.forEach(([key, value, description]) => {
      this.db.run(`
        INSERT OR IGNORE INTO system_config (config_key, config_value, description, updated_by)
        VALUES (?, ?, ?, 'system')
      `, [key, value, description]);
    });
  }

  // Métodos para gerenciamento de grupo técnico
  definirGrupoTecnico(groupId, updatedBy) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO system_config (config_key, config_value, description, updated_by, updated_at)
        VALUES ('grupo_tecnico', ?, 'ID do grupo técnico no WhatsApp', ?, CURRENT_TIMESTAMP)
      `, [groupId, updatedBy], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  obterGrupoTecnico() {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT config_value FROM system_config WHERE config_key = ?',
        ['grupo_tecnico'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.config_value : config.whatsapp.grupoTecnico);
        }
      );
    });
  }

  // Métodos para parsing de menções do WhatsApp
  extrairTelefonesDeMencoes(text) {
    // Regex para capturar menções do WhatsApp no formato @5569xxxxxxxx
    const mentionRegex = /@(\d{10,15})/g;
    const telefones = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      telefones.push(match[1]);
    }
    
    return telefones;
  }

  // Método para buscar usuário root principal
  buscarUsuarioRootPrincipal() {
    return new Promise((resolve, reject) => {
      // Buscar o primeiro usuário root da lista de números root configurados
      const rootNumbers = config.whatsapp.rootNumbers;
      if (rootNumbers.length === 0) {
        resolve(null);
        return;
      }

      this.db.get(
        'SELECT * FROM usuarios WHERE telefone = ? AND role = ?',
        [rootNumbers[0], 'root'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Métodos para Ordens de Serviço
  criarOS(dados) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO ordens_servico 
        (usuario_nome, usuario_telefone, local_atendimento, equipamento, anydesk, problema, setor)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        dados.usuario_nome,
        dados.usuario_telefone,
        dados.local_atendimento,
        dados.equipamento,
        dados.anydesk,
        dados.problema,
        dados.setor || 'TI'
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  buscarOS(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM ordens_servico WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  listarOSAbertas() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM ordens_servico WHERE status IN ('aberta', 'em_andamento') ORDER BY prioridade DESC, created_at ASC",
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  atualizarStatusOS(id, status, tecnico = null) {
    return new Promise((resolve, reject) => {
      let sql = 'UPDATE ordens_servico SET status = ?, updated_at = CURRENT_TIMESTAMP';
      let params = [status];

      if (tecnico) {
        sql += ', tecnico_responsavel = ?';
        params.push(tecnico);
      }

      if (status === 'finalizada') {
        sql += ', finalizada_at = CURRENT_TIMESTAMP';
      }

      sql += ' WHERE id = ?';
      params.push(id);

      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  definirPrioridadeOS(id, prioridade = 1) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE ordens_servico SET prioridade = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [prioridade, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  alterarSetorOS(id, setor) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE ordens_servico SET setor = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [setor, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Métodos para Usuários
  criarOuAtualizarUsuario(telefone, nome = null, role = 'user') {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO usuarios (telefone, nome, role, last_activity)
        VALUES (?, COALESCE(?, (SELECT nome FROM usuarios WHERE telefone = ?)), ?, CURRENT_TIMESTAMP)
      `, [telefone, nome, telefone, role], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  buscarUsuario(telefone) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM usuarios WHERE telefone = ?',
        [telefone],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  listarUsuariosPorRole(role) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM usuarios WHERE role = ? ORDER BY nome',
        [role],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  listarUsuariosRoot() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM usuarios WHERE role = ? ORDER BY nome',
        ['root'],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  alterarRoleUsuario(telefone, novaRole) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE usuarios SET role = ? WHERE telefone = ?',
        [novaRole, telefone],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Métodos para Histórico
  adicionarMensagemHistorico(ordemId, telefone, mensagem, tipo = 'user') {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO historico_mensagens (ordem_id, usuario_telefone, mensagem, tipo)
        VALUES (?, ?, ?, ?)
      `, [ordemId, telefone, mensagem, tipo], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  buscarHistoricoOS(ordemId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM historico_mensagens WHERE ordem_id = ? ORDER BY created_at',
        [ordemId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Métodos para Configurações
  salvarConfiguracao(chave, valor) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO configuracoes (chave, valor, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `, [chave, valor], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  buscarConfiguracao(chave) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT valor FROM configuracoes WHERE chave = ?',
        [chave],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.valor : null);
        }
      );
    });
  }

  // Limpeza automática do histórico
  limparHistoricoAntigo() {
    return new Promise((resolve, reject) => {
      // Buscar configuração atual de dias para manter
      this.db.get(
        'SELECT config_value FROM system_config WHERE config_key = ?',
        ['cleanup_days'],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          const diasParaManter = row ? parseInt(row.config_value) : config.cleanup.daysToKeep;
          
          this.db.run(`
            DELETE FROM ordens_servico 
            WHERE status = 'finalizada' 
            AND finalizada_at < datetime('now', '-${diasParaManter} days')
          `, function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          });
        }
      );
    });
  }

  // Métodos para Solicitações de Peças
  criarSolicitacaoPecas(dados) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO solicitacoes_pecas 
        (ordem_id, tecnico_telefone, tecnico_nome, pecas_solicitadas, observacoes)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        dados.ordem_id,
        dados.tecnico_telefone,
        dados.tecnico_nome,
        dados.pecas_solicitadas,
        dados.observacoes
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  listarSolicitacoesPecas(status = null) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT sp.*, os.usuario_nome, os.local_atendimento, os.equipamento, os.problema
        FROM solicitacoes_pecas sp
        JOIN ordens_servico os ON sp.ordem_id = os.id
      `;
      let params = [];

      if (status) {
        sql += ' WHERE sp.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY sp.created_at DESC';

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  buscarSolicitacaoPecas(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT sp.*, os.usuario_nome, os.local_atendimento, os.equipamento, os.problema
        FROM solicitacoes_pecas sp
        JOIN ordens_servico os ON sp.ordem_id = os.id
        WHERE sp.id = ?
      `;
      
      this.db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  atualizarStatusSolicitacaoPecas(id, status, almoxarifado = null) {
    return new Promise((resolve, reject) => {
      let sql = 'UPDATE solicitacoes_pecas SET status = ?, updated_at = CURRENT_TIMESTAMP';
      let params = [status];

      if (almoxarifado) {
        sql += ', almoxarifado_responsavel = ?';
        params.push(almoxarifado);
      }

      if (status === 'atendida') {
        sql += ', atendida_at = CURRENT_TIMESTAMP';
      }

      sql += ' WHERE id = ?';
      params.push(id);

      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  listarSolicitacoesPorOS(ordemId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM solicitacoes_pecas WHERE ordem_id = ? ORDER BY created_at DESC',
        [ordemId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Estatísticas
  obterEstatisticas() {
    return new Promise((resolve, reject) => {
      const stats = {};
      
      // Total de OS por status
      this.db.all(`
        SELECT status, COUNT(*) as total 
        FROM ordens_servico 
        GROUP BY status
      `, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        stats.porStatus = {};
        rows.forEach(row => {
          stats.porStatus[row.status] = row.total;
        });
        
        // OS por técnico
        this.db.all(`
          SELECT tecnico_responsavel, COUNT(*) as total 
          FROM ordens_servico 
          WHERE tecnico_responsavel IS NOT NULL 
          GROUP BY tecnico_responsavel
        `, [], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          stats.porTecnico = {};
          rows.forEach(row => {
            stats.porTecnico[row.tecnico_responsavel] = row.total;
          });

          // Estatísticas de peças
          this.db.all(`
            SELECT status, COUNT(*) as total 
            FROM solicitacoes_pecas 
            GROUP BY status
          `, [], (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            
            stats.pecasPorStatus = {};
            rows.forEach(row => {
              stats.pecasPorStatus[row.status] = row.total;
            });
            
            resolve(stats);
          });
        });
      });
    });
  }

  // Métodos para Sistema de Usuários
  criarUsuarioSistema(dados) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO system_users (username, password, telefone, role, created_by)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        dados.username,
        dados.password,
        dados.telefone,
        dados.role || 'admin',
        dados.created_by
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  buscarUsuarioSistema(username) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM system_users WHERE username = ?',
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Métodos para Configurações do Sistema
  atualizarConfiguracao(key, value, updatedBy) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE system_config 
        SET config_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE config_key = ?
      `, [value, updatedBy, key], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  buscarConfiguracao(key) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM system_config WHERE config_key = ?',
        [key],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  listarConfiguracoes() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM system_config ORDER BY config_key',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Métodos para Backups
  criarRegistroBackup(dados) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO backups (backup_name, backup_path, backup_size, backup_type, status)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        dados.backup_name,
        dados.backup_path,
        dados.backup_size || 0,
        dados.backup_type || 'manual',
        dados.status || 'completed'
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  listarBackups() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM backups ORDER BY created_at DESC LIMIT 50',
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Método para obter estatísticas para gráficos
  obterEstatisticasGraficos() {
    return new Promise((resolve, reject) => {
      const stats = {};
      
      // OS por mês (últimos 12 meses)
      this.db.all(`
        SELECT 
          strftime('%Y-%m', created_at) as mes,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) as finalizadas
        FROM ordens_servico 
        WHERE created_at >= datetime('now', '-12 months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY mes
      `, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        stats.osPorMes = rows;
        
        // OS por técnico
        this.db.all(`
          SELECT 
            tecnico_responsavel,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) as finalizadas
          FROM ordens_servico 
          WHERE tecnico_responsavel IS NOT NULL
          AND created_at >= datetime('now', '-30 days')
          GROUP BY tecnico_responsavel
          ORDER BY total DESC
        `, [], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          
          stats.osPorTecnico = rows;
          
          // Peças por status
          this.db.all(`
            SELECT status, COUNT(*) as total 
            FROM solicitacoes_pecas 
            WHERE created_at >= datetime('now', '-30 days')
            GROUP BY status
          `, [], (err, rows) => {
            if (err) {
              reject(err);
              return;
            }
            
            stats.pecasPorStatus = rows;
            
            // Tempo médio de resolução
            this.db.get(`
              SELECT 
                AVG(julianday(finalizada_at) - julianday(created_at)) * 24 as tempo_medio_horas
              FROM ordens_servico 
              WHERE status = 'finalizada' 
              AND finalizada_at IS NOT NULL
              AND created_at >= datetime('now', '-30 days')
            `, [], (err, row) => {
              if (err) {
                reject(err);
                return;
              }
              
              stats.tempoMedioResolucao = row?.tempo_medio_horas || 0;
              resolve(stats);
            });
          });
        });
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Erro ao fechar banco de dados:', err.message);
        } else {
          console.log('Conexão com banco de dados fechada.');
        }
        resolve();
      });
    });
  }
}

module.exports = new Database();
