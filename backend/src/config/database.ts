/**
 * Configuração do banco de dados SQLite
 */

import sqlite3 from 'sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'helpdesk.db');

// Garantir que o diretório existe
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

class Database {
  private db: sqlite3.Database | null = null;
  private initialized = false;

  async connect(): Promise<sqlite3.Database> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('❌ Erro ao conectar ao banco:', err);
          reject(err);
        } else {
          console.log('✅ Conectado ao banco SQLite');
          resolve(this.db!);
        }
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    await this.connect();
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.connect();

    // Tabela de usuários (técnicos e admins)
    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'technician',
        skills TEXT DEFAULT '[]',
        avatar TEXT,
        online BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de filas
    await this.run(`
      CREATE TABLE IF NOT EXISTS queues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        skills TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de tickets/chamados
    await this.run(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_phone TEXT NOT NULL,
        customer_name TEXT,
        sector TEXT,
        ticket_type TEXT,
        location TEXT,
        equipment TEXT,
        patrimony TEXT,
        problem TEXT,
        status TEXT DEFAULT 'bot',
        priority INTEGER DEFAULT 0,
        queue_id INTEGER,
        assigned_to INTEGER,
        bot_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        FOREIGN KEY (queue_id) REFERENCES queues (id),
        FOREIGN KEY (assigned_to) REFERENCES users (id)
      )
    `);

    // Tabela de mensagens
    await this.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        sender_type TEXT NOT NULL,
        sender_id INTEGER,
        sender_name TEXT,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        wa_message_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets (id),
        FOREIGN KEY (sender_id) REFERENCES users (id)
      )
    `);

    // Tabela de configurações
    await this.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserir filas padrão
    const defaultQueues = [
      { name: 'Rede', description: 'VPN, Internet, Firewall', skills: JSON.stringify(['rede', 'vpn', 'internet', 'firewall']) },
      { name: 'Sistemas', description: 'LOTUS, MOVTRANS, Balança', skills: JSON.stringify(['sistemas', 'lotus', 'movtrans', 'balanca']) },
      { name: 'Hardware', description: 'PC, Impressora, Periféricos', skills: JSON.stringify(['hardware', 'pc', 'impressora', 'teclado', 'mouse']) },
      { name: 'Geral', description: 'Outros atendimentos', skills: JSON.stringify(['geral']) },
    ];

    for (const queue of defaultQueues) {
      await this.run(
        `INSERT OR IGNORE INTO queues (name, description, skills) VALUES (?, ?, ?)`,
        [queue.name, queue.description, queue.skills]
      );
    }

    // Criar admin padrão se não existir
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@empresa.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Administrador';

    const existingAdmin = await this.get<{ id: number }>('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await this.run(
        `INSERT INTO users (email, password, name, role, skills) VALUES (?, ?, ?, ?, ?)`,
        [adminEmail, hashedPassword, adminName, 'admin', JSON.stringify(['geral'])]
      );
      console.log(`✅ Admin criado: ${adminEmail}`);
    }

    this.initialized = true;
    console.log('✅ Banco de dados inicializado');
  }
}

export const database = new Database();
export default database;
