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

// Mensagens padrão
const defaultMessages = {
  saudacao: 'Olá! Sou o assistente técnico. Como posso ajudá-lo hoje?\n\nPara abrir um chamado, use o comando !abrir ou simplesmente descreva seu problema.',
  final: 'Atendimento finalizado. Obrigado por utilizar nossos serviços!',
  ajuda: `🤖 *COMANDOS DISPONÍVEIS*

*USUÁRIOS:*
• !ajuda - Lista de comandos
• !status [id] - Ver status da OS
• !cancelar [id] - Cancelar OS
• !abrir - Abrir um novo chamado

*TÉCNICOS:*
• !menu - Exibir comandos técnicos
• !atendendo [id] - Assumir OS
• !prioridade [id] - Marcar como prioritário
• !setor [id]=[setor] - Alterar setor
• !mensagem [id]=[texto] - Enviar mensagem ao solicitante
• !list - Listar OS abertas
• !finalizado [id] - Marcar como finalizado
• !adm - Chamar administrador

*ADMINISTRADORES:*
• !config - Menu de configurações
• !listtc - Listar técnicos
• !listadm - Listar administradores
• !menss=[texto] - Alterar saudação
• !msfinal=[texto] - Alterar mensagem final
• !ping - Tempo de resposta
• !tecnico=[num] - Tornar técnico
• !adm=[num] - Tornar administrador
• !almoxarifado=[num] - Tornar almoxarifado
• !historico - Ver histórico de OS

*PEÇAS:*
• !listpeças [id_os] - Solicitar peças para OS
• !pecas - Ver solicitações de peças (almoxarifado)
• !atender [id_solicitacao] - Atender solicitação (almoxarifado)`,
  erro: 'Ops! Ocorreu um erro inesperado. Por favor, tente novamente ou entre em contato com o suporte.',
  aguarde: 'Aguarde um momento, estou processando sua solicitação...',
  indisponivel: 'Sistema temporariamente indisponível para manutenção. Tente novamente em alguns minutos.'
};

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = await getDatabase();

    return new Promise((resolve) => {
      // Buscar mensagens configuradas
      db.all(`
        SELECT config_key, config_value 
        FROM system_config 
        WHERE config_key IN ('mensagem_saudacao', 'mensagem_final', 'mensagem_ajuda', 'mensagem_erro', 'mensagem_aguarde', 'mensagem_indisponivel')
      `, [], (err: any, rows: any[]) => {
        db.close();

        if (err) {
          resolve(NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 }));
          return;
        }

        // Converter para formato esperado
        const messages: any = { ...defaultMessages };
        
        rows.forEach(row => {
          const key = row.config_key.replace('mensagem_', '');
          messages[key] = row.config_value;
        });

        resolve(NextResponse.json({
          messages,
          user: {
            username: user.username,
            role: user.role,
            telefone: user.telefone
          }
        }));
      });
    });
  } catch (error) {
    console.error('Erro na API de mensagens:', error);
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
    const { messages } = body;

    if (!messages || typeof messages !== 'object') {
      return NextResponse.json({ 
        error: 'Dados de mensagens inválidos' 
      }, { status: 400 });
    }

    const db = await getDatabase();

    return new Promise((resolve) => {
      // Preparar as queries de atualização
      const messageKeys = Object.keys(messages);
      let completed = 0;
      let hasError = false;

      if (messageKeys.length === 0) {
        db.close();
        resolve(NextResponse.json({ error: 'Nenhuma mensagem fornecida' }, { status: 400 }));
        return;
      }

      messageKeys.forEach(key => {
        const configKey = `mensagem_${key}`;
        const configValue = messages[key];

        db.run(`
          INSERT OR REPLACE INTO system_config (config_key, config_value, description, updated_by, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [configKey, configValue, `Mensagem de ${key}`, user.username], function(err: any) {
          if (err && !hasError) {
            hasError = true;
            db.close();
            resolve(NextResponse.json({ error: 'Erro ao salvar mensagens' }, { status: 500 }));
            return;
          }

          completed++;
          if (completed === messageKeys.length && !hasError) {
            db.close();
            resolve(NextResponse.json({ 
              success: true, 
              message: 'Mensagens atualizadas com sucesso',
              updated: completed
            }));
          }
        });
      });
    });
  } catch (error) {
    console.error('Erro na API PUT de mensagens:', error);
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

    if (action === 'reset_defaults') {
      // Resetar mensagens para padrão
      return new Promise((resolve) => {
        const messageKeys = Object.keys(defaultMessages);
        let completed = 0;
        let hasError = false;

        messageKeys.forEach(key => {
          const configKey = `mensagem_${key}`;
          const configValue = defaultMessages[key as keyof typeof defaultMessages];

          db.run(`
            INSERT OR REPLACE INTO system_config (config_key, config_value, description, updated_by, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          `, [configKey, configValue, `Mensagem de ${key}`, user.username], function(err: any) {
            if (err && !hasError) {
              hasError = true;
              db.close();
              resolve(NextResponse.json({ error: 'Erro ao resetar mensagens' }, { status: 500 }));
              return;
            }

            completed++;
            if (completed === messageKeys.length && !hasError) {
              db.close();
              resolve(NextResponse.json({ 
                success: true, 
                message: 'Mensagens resetadas para padrão com sucesso',
                messages: defaultMessages
              }));
            }
          });
        });
      });
    }

    if (action === 'export_messages') {
      // Exportar mensagens atuais
      return new Promise((resolve) => {
        db.all(`
          SELECT config_key, config_value 
          FROM system_config 
          WHERE config_key LIKE 'mensagem_%'
        `, [], (err: any, rows: any[]) => {
          db.close();

          if (err) {
            resolve(NextResponse.json({ error: 'Erro ao exportar mensagens' }, { status: 500 }));
            return;
          }

          const exportData: any = {};
          rows.forEach(row => {
            const key = row.config_key.replace('mensagem_', '');
            exportData[key] = row.config_value;
          });

          resolve(NextResponse.json({
            success: true,
            export: exportData,
            timestamp: new Date().toISOString()
          }));
        });
      });
    }

    db.close();
    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });

  } catch (error) {
    console.error('Erro na API POST de mensagens:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
