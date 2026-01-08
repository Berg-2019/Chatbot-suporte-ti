import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Tipos para as OS
interface OrdemServico {
  id: number;
  usuario_nome: string;
  usuario_telefone: string;
  local_atendimento?: string;
  equipamento?: string;
  anydesk?: string;
  problema: string;
  status: string;
  tecnico_responsavel?: string;
  prioridade: number;
  setor: string;
  created_at: string;
  updated_at: string;
  finalizada_at?: string;
}

// Configuração do banco de dados
const dbPath = path.join(process.cwd(), 'bot-whatsapp', 'db', 'atendimento.db');

function getDatabase(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Verificar se o arquivo do banco existe
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = await getDatabase();

    return new Promise((resolve) => {
      let query = `
        SELECT 
          id,
          usuario_nome,
          usuario_telefone,
          local_atendimento,
          equipamento,
          anydesk,
          problema,
          status,
          tecnico_responsavel,
          prioridade,
          setor,
          created_at,
          updated_at,
          finalizada_at
        FROM ordens_servico
      `;

      const params: any[] = [];

      if (status && status !== 'all') {
        query += ' WHERE status = ?';
        params.push(status);
      }

      query += ' ORDER BY prioridade DESC, created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      db.all(query, params, (err: any, rows: OrdemServico[]) => {
        if (err) {
          console.error('Erro na consulta:', err);
          db.close();
          resolve(NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 }));
          return;
        }

        // Contar total de registros
        let countQuery = 'SELECT COUNT(*) as total FROM ordens_servico';
        const countParams: any[] = [];

        if (status && status !== 'all') {
          countQuery += ' WHERE status = ?';
          countParams.push(status);
        }

        db.get(countQuery, countParams, (countErr: any, countRow: any) => {
          db.close();

          if (countErr) {
            console.error('Erro na contagem:', countErr);
            resolve(NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 }));
            return;
          }

          resolve(NextResponse.json({
            orders: rows || [],
            total: countRow?.total || 0,
            limit,
            offset
          }));
        });
      });
    });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, tecnico_responsavel, prioridade, setor } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da OS é obrigatório' }, { status: 400 });
    }

    const db = await getDatabase();

    return new Promise((resolve) => {
      let query = 'UPDATE ordens_servico SET updated_at = CURRENT_TIMESTAMP';
      const params: any[] = [];

      if (status) {
        query += ', status = ?';
        params.push(status);
        
        if (status === 'finalizada') {
          query += ', finalizada_at = CURRENT_TIMESTAMP';
        }
      }

      if (tecnico_responsavel !== undefined) {
        query += ', tecnico_responsavel = ?';
        params.push(tecnico_responsavel);
      }

      if (prioridade !== undefined) {
        query += ', prioridade = ?';
        params.push(prioridade);
      }

      if (setor) {
        query += ', setor = ?';
        params.push(setor);
      }

      query += ' WHERE id = ?';
      params.push(id);

      db.run(query, params, function(this: any, err: any) {
        db.close();

        if (err) {
          console.error('Erro na atualização:', err);
          resolve(NextResponse.json({ error: 'Erro ao atualizar OS' }, { status: 500 }));
          return;
        }

        if (this.changes === 0) {
          resolve(NextResponse.json({ error: 'OS não encontrada' }, { status: 404 }));
          return;
        }

        resolve(NextResponse.json({ success: true, changes: this.changes }));
      });
    });
  } catch (error) {
    console.error('Erro na API PUT:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
