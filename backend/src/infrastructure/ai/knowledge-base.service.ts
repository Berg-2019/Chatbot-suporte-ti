/**
 * Knowledge Base Service
 *
 * Gerencia base de conhecimento com embeddings para RAG melhorado
 * Permite que a IA aprenda com:
 * - Documentação de suporte
 * - Casos resolvidos anteriormente
 * - FAQ
 * - Procedimentos técnicos
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MinimaxEmbeddingsService } from './minimax-embeddings.service';

export interface KnowledgeDocument {
  id?: string;
  nodeType: string; // 'problem', 'solution', 'equipment', 'error', 'procedure'
  title: string;
  description?: string;
  content: any; // JSON content
  tags: string[];
  embedding?: number[];
  relatedKeywords?: string[];
}

@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private useMinimaxEmbeddings = false;

  constructor(
    private prisma: PrismaService,
    private minimaxEmbeddings: MinimaxEmbeddingsService,
  ) {}

  async onModuleInit() {
    // Verificar se MiniMax Embeddings está disponível
    const testResult = await this.minimaxEmbeddings.testConnection();
    this.useMinimaxEmbeddings = testResult.available;

    if (this.useMinimaxEmbeddings) {
      this.logger.log(`✅ MiniMax Embeddings ativo: ${testResult.model} (${testResult.dimensions} dims)`);
    } else {
      this.logger.warn(`⚠️  MiniMax Embeddings indisponível: ${testResult.error}`);
      this.logger.warn(`⚠️  Usando embeddings simples (TF-IDF) como fallback`);
    }

    await this.seedInitialKnowledge();
  }

  /**
   * Popula base de conhecimento inicial com conteúdo de suporte
   */
  private async seedInitialKnowledge() {
    const existingDocs = await this.prisma.knowledgeNode.count();

    if (existingDocs > 0) {
      this.logger.log(`📚 Base de conhecimento já possui ${existingDocs} documentos`);
      return;
    }

    this.logger.log('📚 Populando base de conhecimento inicial...');

    const initialKnowledge: KnowledgeDocument[] = [
      // ===== FAQ - Problemas Comuns de TI =====
      {
        nodeType: 'problem',
        title: 'Computador não liga',
        description: 'Problema: Computador não liga ou não dá sinal de vida',
        content: {
          solutions: [
            'Verificar se cabo de energia está conectado',
            'Verificar se tomada está funcionando',
            'Verificar se estabilizador/nobreak está ligado',
            'Pressionar botão power por 5 segundos',
            'Verificar led da fonte (deve acender)',
            'Se persiste: chamar técnico para verificar hardware'
          ],
          avgResolutionTime: '15-30 minutos',
          category: 'Hardware',
          urgency: 'Alta'
        },
        tags: ['computador', 'hardware', 'não liga', 'cpu', 'pc'],
      },
      {
        nodeType: 'problem',
        title: 'Sem acesso à internet',
        description: 'Problema: Computador sem acesso à internet',
        content: {
          solutions: [
            'Verificar se cabo de rede está conectado (luz no conector)',
            'Reiniciar adaptador de rede: Windows: Painel de Controle > Rede > Desabilitar/Habilitar',
            'Verificar se Wi-Fi está ativado',
            'Teste de ping: cmd > ping 8.8.8.8',
            'Verificar proxy/VPN',
            'Reiniciar roteador/switch',
            'Se persiste: verificar com infraestrutura de rede'
          ],
          avgResolutionTime: '10-20 minutos',
          category: 'Infraestrutura',
          urgency: 'Alta'
        },
        tags: ['internet', 'rede', 'conexão', 'wifi', 'lan'],
      },
      {
        nodeType: 'problem',
        title: 'Impressora não imprime',
        description: 'Problema: Impressora não imprime ou trava fila',
        content: {
          solutions: [
            'Verificar se impressora está ligada e com papel',
            'Verificar fila de impressão: Windows: Painel > Dispositivos > Impressoras > Limpar fila',
            'Reiniciar serviço de spooler: Windows: services.msc > Spooler de Impressão > Reiniciar',
            'Verificar cabo USB/rede',
            'Reinstalar driver da impressora',
            'Verificar se tem toner/tinta',
            'Teste de página: imprimir teste direto da impressora'
          ],
          avgResolutionTime: '15-25 minutos',
          category: 'Hardware',
          urgency: 'Média'
        },
        tags: ['impressora', 'imprimir', 'fila', 'spooler', 'hardware'],
      },
      {
        nodeType: 'problem',
        title: 'Sistema lento',
        description: 'Problema: Computador ou sistema muito lento',
        content: {
          diagnostic: [
            'Verificar uso de CPU/Memória (Gerenciador de Tarefas)',
            'Verificar processos suspeitos',
            'Verificar espaço em disco (mínimo 15% livre)',
            'Verificar antivírus em execução'
          ],
          solutions: [
            'Fechar programas desnecessários',
            'Limpar arquivos temporários (cleanmgr)',
            'Desabilitar programas de inicialização',
            'Verificar malware/vírus',
            'Desfragmentar HD (se não for SSD)',
            'Aumentar memória RAM (solução definitiva)'
          ],
          avgResolutionTime: '20-40 minutos',
          category: 'Sistemas',
          urgency: 'Média'
        },
        tags: ['lento', 'performance', 'travando', 'cpu', 'memória'],
      },

      // ===== FAQ - Problemas Elétricos =====
      {
        nodeType: 'problem',
        title: 'Tomada não funciona',
        description: 'Problema: Tomada sem energia',
        content: {
          verifications: [
            'Testar com outro equipamento na mesma tomada',
            'Verificar disjuntor do setor',
            'Verificar se não caiu disjuntor geral',
            'Verificar se outros equipamentos do setor funcionam'
          ],
          actions: [
            'Se apenas 1 tomada: problema pontual',
            'Se várias tomadas: problema no disjuntor/circuito',
            'NUNCA mexer em parte elétrica sem ser eletricista'
          ],
          avgResolutionTime: '30-60 minutos',
          category: 'Elétrica',
          urgency: 'Alta (se afetar equipamentos críticos)'
        },
        tags: ['tomada', 'energia', 'elétrica', 'disjuntor'],
      },
      {
        nodeType: 'problem',
        title: 'Ar-condicionado não liga',
        description: 'Problema: Ar-condicionado não funciona',
        content: {
          verifications: [
            'Verificar se controle remoto tem pilha',
            'Verificar se led do AC acende',
            'Verificar disjuntor específico do AC',
            'Verificar se filtro não está sujo (impede funcionamento)',
            'Testar ligar direto no aparelho (sem controle)'
          ],
          preventiveMaintenance: [
            'Limpar filtro mensalmente',
            'Manutenção técnica semestral',
            'Verificar vazamento de gás'
          ],
          avgResolutionTime: '20-40 minutos (problema simples)',
          category: 'Ar-Condicionado',
          urgency: 'Média'
        },
        tags: ['ar-condicionado', 'ac', 'climatização', 'não liga'],
      },

      // ===== Procedimentos Técnicos =====
      {
        nodeType: 'procedure',
        title: 'Procedimento: Reset de senha Active Directory',
        description: 'Procedimento para reset de senha de usuário',
        content: {
          prerequisites: [
            'Acesso ao Active Directory',
            'Permissão de administrador'
          ],
          steps: [
            'Abrir "Active Directory Users and Computers"',
            'Localizar usuário',
            'Botão direito > Reset Password',
            'Definir nova senha (mínimo 8 caracteres, maiúscula, número, símbolo)',
            'Marcar "User must change password at next logon"',
            'OK',
            'Informar usuário da nova senha temporária'
          ],
          estimatedTime: '5 minutos',
          sla: '30 minutos'
        },
        tags: ['senha', 'password', 'reset', 'active directory', 'ad'],
      },
      {
        nodeType: 'procedure',
        title: 'Procedimento: Instalação de software padrão',
        description: 'Procedimento para instalação de software corporativo',
        content: {
          standardSoftware: [
            'Office 365',
            'Adobe Reader',
            'Google Chrome',
            'WinRAR',
            'Antivírus corporativo'
          ],
          steps: [
            'Verificar licença disponível',
            'Download do repositório corporativo \\\\server\\software',
            'Executar instalador como administrador',
            'Seguir wizard de instalação',
            'Ativar licença corporativa',
            'Testar funcionamento',
            'Registrar instalação no asset management'
          ],
          estimatedTime: '15-30 minutos por software',
          sla: '2 horas'
        },
        tags: ['instalação', 'software', 'programa', 'office'],
      },

      // ===== Casos Resolvidos Comuns =====
      {
        nodeType: 'solution',
        title: 'Caso resolvido: Outlook não sincroniza',
        description: 'Problema: Outlook não sincroniza emails',
        content: {
          rootCause: 'Arquivo OST corrompido',
          solution: [
            'Fechar Outlook',
            'Renomear arquivo OST: Localização: C:\\Users\\[user]\\AppData\\Local\\Microsoft\\Outlook',
            'Renomear nome.ost para nome.ost.old',
            'Reabrir Outlook',
            'Sistema cria novo arquivo OST automaticamente',
            'Aguardar sincronização completa (pode levar 10-30 min)'
          ],
          successRate: '100%',
          avgTime: '20 minutos + tempo sincronização',
          recurrence: 'Baixa após solução'
        },
        tags: ['outlook', 'email', 'sincronização', 'ost', 'office'],
      },
      {
        nodeType: 'solution',
        title: 'Caso resolvido: VPN não conecta',
        description: 'Problema: VPN corporativa não estabelece conexão',
        content: {
          commonCauses: [
            { cause: 'Certificado expirado', percentage: '70%' },
            { cause: 'Firewall bloqueando', percentage: '20%' },
            { cause: 'Credenciais incorretas', percentage: '10%' }
          ],
          solutionByCause: {
            certificateExpired: [
              'Renovar certificado via portal interno',
              'Reinstalar cliente VPN com novo certificado'
            ],
            firewall: [
              'Verificar se portas 443, 1194 estão abertas',
              'Adicionar exceção no firewall/antivírus'
            ],
            credentials: [
              'Reset de senha',
              'Verificar se conta não está bloqueada'
            ]
          },
          successRate: '95%',
          avgTime: '15 minutos'
        },
        tags: ['vpn', 'conexão', 'rede', 'acesso remoto'],
      },

      // ===== Documentação =====
      {
        nodeType: 'equipment',
        title: 'Documentação: Estrutura de rede corporativa',
        description: 'Infraestrutura de rede da empresa',
        content: {
          topology: {
            coreSwitch: 'Cisco Catalyst 9500',
            distributionSwitches: '8 switches layer 3',
            accessSwitches: '45 switches layer 2',
            wifi: 'Controladora Aruba com 60 APs'
          },
          vlans: [
            { id: 10, name: 'Administrativo', network: '192.168.10.0/24' },
            { id: 20, name: 'Produção', network: '192.168.20.0/24' },
            { id: 30, name: 'TI', network: '192.168.30.0/24' },
            { id: 40, name: 'Visitantes', network: '192.168.40.0/24' }
          ],
          criticalServers: [
            { name: 'DC1', description: 'Active Directory primário' },
            { name: 'DC2', description: 'Active Directory secundário' },
            { name: 'FILE01', description: 'File server' },
            { name: 'PRINT01', description: 'Print server' },
            { name: 'APPS', description: 'Servidor de aplicações' }
          ],
          contact: 'NOC: ramal 9999'
        },
        tags: ['rede', 'infraestrutura', 'vlan', 'switch', 'servidor'],
      },
    ];

    let created = 0;
    for (const doc of initialKnowledge) {
      try {
        // Gerar embedding baseado em título + descrição + tags
        const textForEmbedding = `${doc.title} ${doc.description || ''} ${doc.tags.join(' ')}`;
        const embedding = await this.generateEmbedding(textForEmbedding);

        await this.prisma.knowledgeNode.create({
          data: {
            nodeType: doc.nodeType,
            title: doc.title,
            description: doc.description || null,
            content: doc.content as any,
            embedding: embedding as any,
            relatedNodes: { keywords: doc.tags } as any,
          },
        });
        created++;
      } catch (error: any) {
        this.logger.error(`Erro ao criar documento "${doc.title}": ${error.message}`);
      }
    }

    this.logger.log(`✅ Base de conhecimento populada com ${created} documentos`);
  }

  /**
   * Busca documentos similares baseado em query
   */
  async searchSimilar(query: string, limit: number = 5, nodeType?: string): Promise<any[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    const whereClause = nodeType ? { nodeType } : {};

    const documents = await this.prisma.knowledgeNode.findMany({
      where: whereClause,
      take: 100, // Pegar mais documentos para filtrar por similaridade
    });

    // Calcular similaridade
    const withSimilarity = documents
      .map(doc => ({
        ...doc,
        similarity: this.cosineSimilarity(queryEmbedding, doc.embedding as any),
      }))
      .filter(doc => doc.similarity > 0.3) // Threshold mínimo
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return withSimilarity;
  }

  /**
   * Gera contexto enriquecido para a IA
   */
  async generateEnrichedContext(userMessage: string): Promise<string> {
    const similarDocs = await this.searchSimilar(userMessage, 3);

    if (similarDocs.length === 0) {
      return '';
    }

    let context = '📚 Conhecimento relevante da base de suporte:\n\n';

    similarDocs.forEach((doc, idx) => {
      context += `${idx + 1}. ${doc.title} (${(doc.similarity * 100).toFixed(0)}% relevante)\n`;
      context += `Tipo: ${doc.nodeType}\n`;
      if (doc.description) {
        context += `${doc.description}\n`;
      }
      // Serializar conteúdo JSON para texto
      const contentStr = typeof doc.content === 'object'
        ? JSON.stringify(doc.content).substring(0, 200)
        : String(doc.content).substring(0, 200);
      context += `${contentStr}...\n\n`;
    });

    return context;
  }

  /**
   * Adiciona novo conhecimento à base
   */
  async addKnowledge(doc: KnowledgeDocument): Promise<void> {
    const textForEmbedding = `${doc.title} ${doc.description || ''} ${doc.tags.join(' ')}`;
    const embedding = await this.generateEmbedding(textForEmbedding);

    await this.prisma.knowledgeNode.create({
      data: {
        nodeType: doc.nodeType,
        title: doc.title,
        description: doc.description || null,
        content: doc.content as any,
        embedding: embedding as any,
        relatedNodes: { keywords: doc.tags } as any,
      },
    });

    this.logger.log(`✅ Novo conhecimento adicionado: ${doc.title}`);
  }

  /**
   * Gera embedding (MiniMax ou fallback simples)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (this.useMinimaxEmbeddings) {
      try {
        const result = await this.minimaxEmbeddings.generateEmbedding(text);
        return result.embedding;
      } catch (error: any) {
        this.logger.warn(`⚠️  Falha ao gerar embedding MiniMax, usando fallback: ${error.message}`);
        return this.generateSimpleEmbedding(text);
      }
    }

    return this.generateSimpleEmbedding(text);
  }

  /**
   * Embedding simples usando TF-IDF (fallback)
   */
  private generateSimpleEmbedding(text: string): number[] {
    const words = text.toLowerCase()
      .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    const embedding = new Array(128).fill(0);

    Array.from(wordFreq.entries()).forEach(([word, freq]) => {
      const hash = this.simpleHash(word);
      embedding[hash % 128] += freq;
    });

    // Normalizar
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  /**
   * Hash simples para distribuir palavras
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Similaridade de cosseno entre vetores
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0;

    return dotProduct / (magA * magB);
  }
}
