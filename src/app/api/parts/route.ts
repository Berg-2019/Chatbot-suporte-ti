import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Tipos para as solicitações de peças
interface SolicitacaoPecas {
  id: number;
  ordem_id: number;
  tecnico_telefone: string;
  tecnico_nome: string;
  pecas_solicitadas: string;
  observacoes?: string;
  status: string;
  almoxarifado_responsavel?: string;
  created_at: string;
  updated_at: string;
  atendida_at?: string;
  // Dados da OS relacionada
  usuario_nome: string;
  local_atendimento?: string;
  equipamento?: string;
  problema: string;
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
          sp.id,
          sp.ordem_id,
          sp.tecnico_telefone,
          sp.tecnico_nome,
          sp.pecas_solicitadas,
          sp.observacoes,
          sp.status,
          sp.almoxarifado_responsavel,
          sp.created_at,
          sp.updated_at,
          sp.atendida_at,
          os.usuario_nome,
          os.local_atendimento,
          os.equipamento,
          os.problema
        FROM solicitacoes_pecas sp
        JOIN ordens_servico os ON sp.ordem_id = os.id
      `;

      const params: any[] = [];

      if (status && status !== 'all') {
        query += ' WHERE sp.status = ?';
        params.push(status);
      }

      query += ' ORDER BY sp.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      db.all(query, params, (err: any, rows: SolicitacaoPecas[]) => {
        if (err) {
          console.error('Erro na consulta:', err);
          db.close();
          resolve(NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 }));
          return;
        }

        // Contar total de registros
        let countQuery = 'SELECT COUNT(*) as total FROM solicitacoes_pecas sp';
        const countParams: any[] = [];

        if (status && status !== 'all') {
          countQuery += ' WHERE sp.status = ?';
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
            parts: rows || [],
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
    const { id, status, almoxarifado_responsavel } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID da solicitação é obrigatório' }, { status: 400 });
    }

    const db = await getDatabase();

    return new Promise((resolve) => {
      let query = 'UPDATE solicitacoes_pecas SET updated_at = CURRENT_TIMESTAMP';
      const params: any[] = [];

      if (status) {
        query += ', status = ?';
        params.push(status);
        
        if (status === 'atendida') {
          query += ', atendida_at = CURRENT_TIMESTAMP';
        }
      }

      if (almoxarifado_responsavel !== undefined) {
        query += ', almoxarifado_responsavel = ?';
        params.push(almoxarifado_responsavel);
      }

      query += ' WHERE id = ?';
      params.push(id);

      db.run(query, params, function(this: any, err: any) {
        db.close();

        if (err) {
          console.error('Erro na atualização:', err);
          resolve(NextResponse.json({ error: 'Erro ao atualizar solicitação' }, { status: 500 }));
          return;
        }

        if (this.changes === 0) {
          resolve(NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 }));
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ordem_id, tecnico_telefone, tecnico_nome, pecas_solicitadas, observacoes } = body;

    if (!ordem_id || !tecnico_telefone || !pecas_solicitadas) {
      return NextResponse.json({ 
        error: 'Campos obrigatórios: ordem_id, tecnico_telefone, pecas_solicitadas' 
      }, { status: 400 });
    }

    const db = await getDatabase();

    return new Promise((resolve) => {
      const query = `
        INSERT INTO solicitacoes_pecas 
        (ordem_id, tecnico_telefone, tecnico_nome, pecas_solicitadas, observacoes)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.run(query, [ordem_id, tecnico_telefone, tecnico_nome, pecas_solicitadas, observacoes], function(this: any, err: any) {
        db.close();

        if (err) {
          console.error('Erro na inserção:', err);
          resolve(NextResponse.json({ error: 'Erro ao criar solicitação' }, { status: 500 }));
          return;
        }

        resolve(NextResponse.json({ 
          success: true, 
          id: this.lastID,
          message: 'Solicitação de peças criada com sucesso'
        }));
      });
    });
  } catch (error) {
    console.error('Erro na API POST:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
