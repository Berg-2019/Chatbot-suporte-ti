/**
 * Serviço de Banco de Dados
 * Usando SQLite para persistência
 * 
 * @author Sistema de Atendimento Técnico
 */

import sqlite3 from "sqlite3";
import path from "node:path";
import fs from "node:fs";
import { DB_DIR, BACKUPS_DIR, ROOT_NUMBERS } from "../config.js";
import { infoLog, errorLog, successLog } from "../utils/logger.js";

// Garantir que os diretórios existam
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

const dbPath = path.join(DB_DIR, "atendimento.db");

/**
 * Classe de gerenciamento do banco de dados
 */
class Database {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  /**
   * Conecta ao banco de dados
   */
  async connect() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          errorLog("Erro ao conectar ao banco de dados", err);
          reject(err);
        } else {
          infoLog("Conectado ao banco de dados SQLite");
          resolve(this.db);
        }
      });
    });
  }

  /**
   * Executa uma query que não retorna dados
   */
  async run(sql, params = []) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Executa uma query que retorna uma linha
   */
  async get(sql, params = []) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Executa uma query que retorna múltiplas linhas
   */
  async all(sql, params = []) {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  /**
   * Inicializa as tabelas do banco de dados
   */
  async initialize() {
    if (this.initialized) return;

    await this.connect();

    // Tabela de Ordens de Serviço
    await this.run(`
      CREATE TABLE IF NOT EXISTS ordens_servico (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_nome TEXT NOT NULL,
        usuario_telefone TEXT NOT NULL,
        local_atendimento TEXT,
        equipamento TEXT,
        patrimonio TEXT,
        problema TEXT NOT NULL,
        status TEXT DEFAULT 'aberta',
        tecnico_responsavel TEXT,
        prioridade INTEGER DEFAULT 0,
        setor TEXT DEFAULT 'TI',
        tipo_chamado TEXT,
        nivel_escalacao INTEGER DEFAULT 1,
        primeiro_contato_at DATETIME,
        escalado_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finalizada_at DATETIME
      )
    `);

    // Tabela de Usuários
    await this.run(`
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
    await this.run(`
      CREATE TABLE IF NOT EXISTS historico_mensagens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ordem_id INTEGER,
        usuario_telefone TEXT,
        mensagem TEXT,
        tipo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ordem_id) REFERENCES ordens_servico (id)
      )
    `);

    // Tabela de Configurações
    await this.run(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Fluxo de Conversação
    await this.run(`
      CREATE TABLE IF NOT EXISTS fluxo_conversacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_telefone TEXT UNIQUE NOT NULL,
        etapa_atual TEXT DEFAULT 'inicio',
        dados_coletados TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Backups
    await this.run(`
      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_name TEXT NOT NULL,
        backup_path TEXT NOT NULL,
        backup_size INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserir usuários root
    for (const numero of ROOT_NUMBERS) {
      await this.run(
        `INSERT OR IGNORE INTO usuarios (telefone, nome, role) VALUES (?, 'Root User', 'root')`,
        [numero]
      );
    }

    this.initialized = true;
    successLog("Banco de dados inicializado");
  }

  // ============================================================================
  // ORDENS DE SERVIÇO
  // ============================================================================

  /**
   * Cria uma nova Ordem de Serviço
   */
  async createOS(data) {
    await this.initialize();
    const result = await this.run(
      `INSERT INTO ordens_servico 
       (usuario_nome, usuario_telefone, local_atendimento, equipamento, patrimonio, problema, setor, tipo_chamado, status, nivel_escalacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.usuario_nome,
        data.usuario_telefone,
        data.local_atendimento,
        data.equipamento,
        data.patrimonio,
        data.problema,
        data.setor,
        data.tipo_chamado,
        data.status || "aberta",
        data.nivel_escalacao || 1,
      ]
    );
    return result.lastID;
  }

  /**
   * Obtém uma OS por ID
   */
  async getOS(id) {
    await this.initialize();
    return await this.get("SELECT * FROM ordens_servico WHERE id = ?", [id]);
  }

  /**
   * Atualiza uma OS
   */
  async updateOS(id, data) {
    await this.initialize();
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((f) => `${f} = ?`).join(", ");
    
    await this.run(
      `UPDATE ordens_servico SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
  }

  /**
   * Obtém todas as OS abertas
   */
  async getOSAbertas() {
    await this.initialize();
    return await this.all(
      `SELECT * FROM ordens_servico 
       WHERE status NOT IN ('finalizada', 'cancelada') 
       ORDER BY 
         CASE WHEN status = 'escalada' THEN 0 ELSE 1 END,
         nivel_escalacao DESC,
         prioridade DESC,
         created_at ASC`
    );
  }

  /**
   * Obtém OS pendentes (sem técnico)
   */
  async getOSPendentes() {
    await this.initialize();
    return await this.all(
      `SELECT * FROM ordens_servico 
       WHERE status IN ('aberta', 'escalada') AND tecnico_responsavel IS NULL
       ORDER BY nivel_escalacao DESC, created_at ASC`
    );
  }

  /**
   * Obtém OS de um usuário
   */
  async getOSUsuario(telefone) {
    await this.initialize();
    return await this.all(
      `SELECT * FROM ordens_servico WHERE usuario_telefone = ? ORDER BY created_at DESC LIMIT 20`,
      [telefone]
    );
  }

  /**
   * Obtém OS aberta do usuário
   */
  async getOSAbertaUsuario(telefone) {
    await this.initialize();
    return await this.get(
      `SELECT * FROM ordens_servico 
       WHERE usuario_telefone = ? AND status NOT IN ('finalizada', 'cancelada') 
       ORDER BY created_at DESC LIMIT 1`,
      [telefone]
    );
  }

  // ============================================================================
  // USUÁRIOS
  // ============================================================================

  /**
   * Obtém usuário por telefone
   */
  async getUsuario(telefone) {
    await this.initialize();
    return await this.get("SELECT * FROM usuarios WHERE telefone = ?", [telefone]);
  }

  /**
   * Cria ou atualiza usuário
   */
  async upsertUsuario(telefone, nome) {
    await this.initialize();
    await this.run(
      `INSERT INTO usuarios (telefone, nome, last_activity) 
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(telefone) DO UPDATE SET 
         nome = COALESCE(?, nome),
         last_activity = CURRENT_TIMESTAMP`,
      [telefone, nome, nome]
    );
  }

  /**
   * Atualiza role do usuário
   */
  async updateUsuarioRole(telefone, role) {
    await this.initialize();
    await this.run(
      `INSERT INTO usuarios (telefone, role) VALUES (?, ?)
       ON CONFLICT(telefone) DO UPDATE SET role = ?`,
      [telefone, role, role]
    );
  }

  /**
   * Obtém lista de técnicos
   */
  async getTecnicos() {
    await this.initialize();
    return await this.all(
      `SELECT * FROM usuarios WHERE role IN ('tecnico', 'admin', 'root') ORDER BY role, nome`
    );
  }

  // ============================================================================
  // FLUXO DE CONVERSAÇÃO
  // ============================================================================

  /**
   * Obtém fluxo de conversação
   */
  async getFluxo(telefone) {
    await this.initialize();
    const row = await this.get(
      "SELECT * FROM fluxo_conversacao WHERE usuario_telefone = ?",
      [telefone]
    );
    
    if (row) {
      return {
        ...row,
        dados_coletados: JSON.parse(row.dados_coletados || "{}"),
      };
    }
    return null;
  }

  /**
   * Salva fluxo de conversação
   */
  async saveFluxo(telefone, etapa, dados) {
    await this.initialize();
    await this.run(
      `INSERT INTO fluxo_conversacao (usuario_telefone, etapa_atual, dados_coletados, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(usuario_telefone) DO UPDATE SET 
         etapa_atual = ?,
         dados_coletados = ?,
         updated_at = CURRENT_TIMESTAMP`,
      [telefone, etapa, JSON.stringify(dados), etapa, JSON.stringify(dados)]
    );
  }

  /**
   * Deleta fluxo de conversação
   */
  async deleteFluxo(telefone) {
    await this.initialize();
    await this.run("DELETE FROM fluxo_conversacao WHERE usuario_telefone = ?", [telefone]);
  }

  // ============================================================================
  // HISTÓRICO
  // ============================================================================

  /**
   * Adiciona entrada ao histórico
   */
  async addHistorico(ordemId, telefone, mensagem, tipo) {
    await this.initialize();
    await this.run(
      `INSERT INTO historico_mensagens (ordem_id, usuario_telefone, mensagem, tipo)
       VALUES (?, ?, ?, ?)`,
      [ordemId, telefone, mensagem, tipo]
    );
  }

  // ============================================================================
  // CONFIGURAÇÕES
  // ============================================================================

  /**
   * Obtém configurações
   */
  async getConfigs() {
    await this.initialize();
    const rows = await this.all("SELECT * FROM configuracoes");
    const configs = {};
    for (const row of rows) {
      configs[row.chave] = row.valor;
    }
    return configs;
  }

  /**
   * Define configuração
   */
  async setConfig(chave, valor) {
    await this.initialize();
    await this.run(
      `INSERT INTO configuracoes (chave, valor, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(chave) DO UPDATE SET valor = ?, updated_at = CURRENT_TIMESTAMP`,
      [chave, valor, valor]
    );
  }

  // ============================================================================
  // RELATÓRIOS
  // ============================================================================

  /**
   * Obtém estatísticas para relatório
   */
  async getStats(startDate, endDate) {
    await this.initialize();

    const total = await this.get(
      `SELECT COUNT(*) as count FROM ordens_servico 
       WHERE created_at BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const porStatus = await this.all(
      `SELECT status, COUNT(*) as count FROM ordens_servico 
       WHERE created_at BETWEEN ? AND ?
       GROUP BY status`,
      [startDate, endDate]
    );

    const porSetor = await this.all(
      `SELECT setor, COUNT(*) as count FROM ordens_servico 
       WHERE created_at BETWEEN ? AND ?
       GROUP BY setor ORDER BY count DESC`,
      [startDate, endDate]
    );

    const porTipo = await this.all(
      `SELECT tipo_chamado, COUNT(*) as count FROM ordens_servico 
       WHERE created_at BETWEEN ? AND ? AND tipo_chamado IS NOT NULL
       GROUP BY tipo_chamado ORDER BY count DESC`,
      [startDate, endDate]
    );

    const topTecnicos = await this.all(
      `SELECT tecnico_responsavel, COUNT(*) as count FROM ordens_servico 
       WHERE created_at BETWEEN ? AND ? AND tecnico_responsavel IS NOT NULL
       GROUP BY tecnico_responsavel ORDER BY count DESC LIMIT 5`,
      [startDate, endDate]
    );

    const tempoMedioResolucao = await this.get(
      `SELECT AVG(
         (julianday(finalizada_at) - julianday(created_at)) * 24 * 60
       ) as minutos
       FROM ordens_servico 
       WHERE created_at BETWEEN ? AND ? AND finalizada_at IS NOT NULL`,
      [startDate, endDate]
    );

    const tempoMedioPrimeiroContato = await this.get(
      `SELECT AVG(
         (julianday(primeiro_contato_at) - julianday(created_at)) * 24 * 60
       ) as minutos
       FROM ordens_servico 
       WHERE created_at BETWEEN ? AND ? AND primeiro_contato_at IS NOT NULL`,
      [startDate, endDate]
    );

    return {
      total: total.count,
      porStatus: Object.fromEntries(porStatus.map((r) => [r.status, r.count])),
      porSetor,
      porTipo,
      topTecnicos,
      tempoMedioResolucaoMinutos: tempoMedioResolucao?.minutos || 0,
      tempoMedioPrimeiroContatoMinutos: tempoMedioPrimeiroContato?.minutos || 0,
    };
  }

  // ============================================================================
  // BACKUP
  // ============================================================================

  /**
   * Cria backup do banco de dados
   */
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `backup_${timestamp}.db`;
    const backupPath = path.join(BACKUPS_DIR, backupName);

    // Copiar arquivo do banco
    fs.copyFileSync(dbPath, backupPath);

    // Registrar backup
    const stats = fs.statSync(backupPath);
    await this.run(
      `INSERT INTO backups (backup_name, backup_path, backup_size) VALUES (?, ?, ?)`,
      [backupName, backupPath, stats.size]
    );

    // Limpar backups antigos (manter últimos 10)
    const backups = await this.all(
      `SELECT * FROM backups ORDER BY created_at DESC`
    );

    for (const backup of backups.slice(10)) {
      if (fs.existsSync(backup.backup_path)) {
        fs.unlinkSync(backup.backup_path);
      }
      await this.run(`DELETE FROM backups WHERE id = ?`, [backup.id]);
    }

    successLog(`Backup criado: ${backupPath}`);
    return backupPath;
  }
}

export const database = new Database();
