import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Configuração do banco de dados
const dbPath = path.join(process.cwd(), 'bot-whatsapp', 'db', 'atendimento.db');

function getDatabase(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dbPath)) {
      reject(new Error('Banco de dados não encontrado. Execute o bot primeiro.'));
      return;
    }

    try {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database(dbPath, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(db);
        }
      });
    } catch (error) {
      reject(new Error('SQLite3 não está instalado. Execute: npm install sqlite3'));
    }
  });
}

interface SystemUser {
  id: number;
  username: string;
  password: string;
  telefone: string;
  role: string;
  created_by: string;
  created_at: string;
  last_login?: string;
}

// Verificar autenticação
async function verifyAuth(request: NextRequest): Promise<SystemUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [username, password] = credentials.split(':');

  const db = await getDatabase();
  
  return new Promise((resolve) => {
    db.get(
      'SELECT * FROM system_users WHERE username = ? AND password = ?',
      [username, password],
      (err: any, row: SystemUser | undefined) => {
        db.close();
        if (err || !row) {
          resolve(null);
        } else {
          resolve(row);
        }
      }
    );
  });
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = await getDatabase();

    return new Promise((resolve) => {
      // Buscar todas as configurações
      db.all('SELECT * FROM system_config ORDER BY config_key', [], (err: any, configs: any[]) => {
        if (err) {
          db.close();
          resolve(NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 }));
          return;
        }

        // Buscar estatísticas do sistema
        db.all(`
          SELECT 
            (SELECT COUNT(*) FROM ordens_servico) as total_os,
            (SELECT COUNT(*) FROM solicitacoes_pecas) as total_pecas,
            (SELECT COUNT(*) FROM usuarios) as total_usuarios,
            (SELECT COUNT(*) FROM backups) as total_backups
        `, [], (statsErr: any, stats: any[]) => {
          db.close();

          if (statsErr) {
            resolve(NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 }));
            return;
          }

          resolve(NextResponse.json({
            configs: configs || [],
            stats: stats[0] || {},
            user: {
              username: user.username,
              role: user.role,
              telefone: user.telefone
            }
          }));
        });
      });
    });
  } catch (error) {
    console.error('Erro na API de configurações:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { config_key, config_value } = body;

    if (!config_key || config_value === undefined) {
      return NextResponse.json({ 
        error: 'config_key e config_value são obrigatórios' 
      }, { status: 400 });
    }

    const db = await getDatabase();

    return new Promise((resolve) => {
      db.run(`
        UPDATE system_config 
        SET config_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE config_key = ?
      `, [config_value, user.username, config_key], function(this: any, err: any) {
        db.close();

        if (err) {
          console.error('Erro na atualização:', err);
          resolve(NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 }));
          return;
        }

        if (this.changes === 0) {
          resolve(NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 }));
          return;
        }

        resolve(NextResponse.json({ 
          success: true, 
          message: 'Configuração atualizada com sucesso',
          changes: this.changes 
        }));
      });
    });
  } catch (error) {
    console.error('Erro na API PUT de configurações:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const db = await getDatabase();

    if (action === 'backup') {
      // Criar backup
      const fs = require('fs');
      const backupDir = path.join(process.cwd(), 'bot-whatsapp', 'backups');
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${timestamp}.db`;
      const backupPath = path.join(backupDir, backupName);
      
      try {
        fs.copyFileSync(dbPath, backupPath);
        const stats = fs.statSync(backupPath);
        
        return new Promise((resolve) => {
          db.run(`
            INSERT INTO backups (backup_name, backup_path, backup_size, backup_type, status)
            VALUES (?, ?, ?, 'manual', 'completed')
          `, [backupName, backupPath, stats.size], function(this: any, err: any) {
            db.close();

            if (err) {
              resolve(NextResponse.json({ error: 'Erro ao registrar backup' }, { status: 500 }));
              return;
            }

            resolve(NextResponse.json({
              success: true,
              message: 'Backup criado com sucesso',
              backup: {
                id: this.lastID,
                name: backupName,
                path: backupPath,
                size: stats.size
              }
            }));
          });
        });
      } catch (backupError) {
        db.close();
        return NextResponse.json({ error: 'Erro ao criar backup' }, { status: 500 });
      }
    }

    if (action === 'system_info') {
      // Obter informações do sistema
      const os = require('os');
      
      const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100, // GB
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100, // GB
        uptime: Math.floor(os.uptime() / 3600), // horas
        processUptime: Math.floor(process.uptime() / 3600), // horas
        processMemory: Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100, // MB
        nodeVersion: process.version
      };

      db.close();
      return NextResponse.json({ success: true, systemInfo });
    }

    if (action === 'toggle_ai') {
      // Alternar status da IA
      const { enabled } = body;
      
      return new Promise((resolve) => {
        db.run(`
          INSERT OR REPLACE INTO system_config (config_key, config_value, description, updated_by)
          VALUES (?, ?, ?, ?)
        `, ['ollama_enabled', enabled ? 'true' : 'false', 'Controle da IA Ollama', user.username], function(this: any, err: any) {
          db.close();

          if (err) {
            console.error('Erro ao atualizar configuração da IA:', err);
            resolve(NextResponse.json({ error: 'Erro ao atualizar configuração da IA' }, { status: 500 }));
            return;
          }

          resolve(NextResponse.json({ 
            success: true, 
            message: `IA ${enabled ? 'ativada' : 'desativada'} com sucesso`,
            enabled: enabled
          }));
        });
      });
    }

    if (action === 'list_root_users') {
      // Listar usuários root
      const database = require('../../../../bot-whatsapp/db/database');
      
      try {
        const rootUsers = await database.listarUsuariosRoot();
        db.close();
        return NextResponse.json({ success: true, rootUsers });
      } catch (error) {
        db.close();
        return NextResponse.json({ error: 'Erro ao buscar usuários root' }, { status: 500 });
      }
    }

    if (action === 'add_root_user') {
      // Adicionar usuário root
      const { telefone } = body;
      const database = require('../../../../bot-whatsapp/db/database');
      
      try {
        await database.alterarRoleUsuario(telefone, 'root');
        db.close();
        return NextResponse.json({ success: true, message: 'Usuário adicionado como root com sucesso' });
      } catch (error) {
        db.close();
        return NextResponse.json({ error: 'Erro ao adicionar usuário root' }, { status: 500 });
      }
    }

    if (action === 'remove_root_user') {
      // Remover usuário root
      const { telefone } = body;
      const database = require('../../../../bot-whatsapp/db/database');
      
      try {
        await database.alterarRoleUsuario(telefone, 'user');
        db.close();
        return NextResponse.json({ success: true, message: 'Usuário removido dos root com sucesso' });
      } catch (error) {
        db.close();
        return NextResponse.json({ error: 'Erro ao remover usuário root' }, { status: 500 });
      }
    }

    db.close();
    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });

  } catch (error) {
    console.error('Erro na API POST de configurações:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
