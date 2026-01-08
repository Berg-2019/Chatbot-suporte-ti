'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Search, 
  User,
  Calendar,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus
} from 'lucide-react';
import Link from 'next/link';

interface SolicitacaoPeca {
  id: number;
  os_id: number;
  os_titulo: string;
  peca_nome: string;
  peca_codigo?: string;
  quantidade: number;
  descricao: string;
  status: 'pendente' | 'em_separacao' | 'atendida' | 'cancelada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  solicitante: string;
  tecnico: string;
  responsavel_almoxarifado?: string;
  data_solicitacao: string;
  data_atualizacao: string;
  observacoes?: string;
}

const mockSolicitacoesPecas: SolicitacaoPeca[] = [
  {
    id: 1,
    os_id: 2,
    os_titulo: "Computador lento",
    peca_nome: "Memória RAM DDR4 8GB",
    peca_codigo: "RAM-DDR4-8GB-001",
    quantidade: 2,
    descricao: "Memória RAM para upgrade do computador da recepção",
    status: "pendente",
    prioridade: "media",
    solicitante: "Maria Santos",
    tecnico: "Carlos Tech",
    data_solicitacao: "2025-01-03T10:30:00",
    data_atualizacao: "2025-01-03T10:30:00"
  },
  {
    id: 2,
    os_id: 7,
    os_titulo: "Instalação de software",
    peca_nome: "HD SSD 500GB",
    peca_codigo: "SSD-500GB-002",
    quantidade: 1,
    descricao: "SSD para melhorar performance do sistema",
    status: "em_separacao",
    prioridade: "alta",
    solicitante: "Fernando Oliveira",
    tecnico: "Ana Tech",
    responsavel_almoxarifado: "Lucia Ferreira",
    data_solicitacao: "2025-01-02T14:20:00",
    data_atualizacao: "2025-01-03T09:15:00",
    observacoes: "Peça localizada no estoque, preparando para entrega"
  },
  {
    id: 3,
    os_id: 12,
    os_titulo: "Problema na impressora",
    peca_nome: "Cartucho de Tinta Preta",
    peca_codigo: "CART-PRETO-003",
    quantidade: 3,
    descricao: "Cartuchos para impressora HP LaserJet",
    status: "atendida",
    prioridade: "baixa",
    solicitante: "João Silva",
    tecnico: "João Tech",
    responsavel_almoxarifado: "Lucia Ferreira",
    data_solicitacao: "2025-01-01T16:45:00",
    data_atualizacao: "2025-01-02T11:30:00",
    observacoes: "Peças entregues e instaladas com sucesso"
  },
  {
    id: 4,
    os_id: 13,
    os_titulo: "Rede instável",
    peca_nome: "Cabo de Rede Cat6 - 10m",
    quantidade: 5,
    descricao: "Cabos para reorganização da rede",
    status: "pendente",
    prioridade: "urgente",
    solicitante: "Roberto Lima",
    tecnico: "Carlos Tech",
    data_solicitacao: "2025-01-03T13:20:00",
    data_atualizacao: "2025-01-03T13:20:00"
  }
];

export default function PecasPage() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoPeca[]>(mockSolicitacoesPecas);
  const [filtro, setFiltro] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-orange-100 text-orange-800';
      case 'em_separacao': return 'bg-blue-100 text-blue-800';
      case 'atendida': return 'bg-green-100 text-green-800';
      case 'cancelada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return 'bg-gray-100 text-gray-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'urgente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock className="w-4 h-4" />;
      case 'em_separacao': return <Package className="w-4 h-4" />;
      case 'atendida': return <CheckCircle className="w-4 h-4" />;
      case 'cancelada': return <AlertTriangle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const solicitacoesFiltradas = solicitacoes.filter(solicitacao => {
    const matchTexto = solicitacao.peca_nome.toLowerCase().includes(filtro.toLowerCase()) ||
                      solicitacao.os_titulo.toLowerCase().includes(filtro.toLowerCase()) ||
                      solicitacao.solicitante.toLowerCase().includes(filtro.toLowerCase()) ||
                      solicitacao.tecnico.toLowerCase().includes(filtro.toLowerCase()) ||
                      (solicitacao.peca_codigo && solicitacao.peca_codigo.toLowerCase().includes(filtro.toLowerCase()));
    const matchStatus = filtroStatus === 'todos' || solicitacao.status === filtroStatus;
    return matchTexto && matchStatus;
  });

  const estatisticas = {
    total: solicitacoes.length,
    pendentes: solicitacoes.filter(s => s.status === 'pendente').length,
    emSeparacao: solicitacoes.filter(s => s.status === 'em_separacao').length,
    atendidas: solicitacoes.filter(s => s.status === 'atendida').length
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/config">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Package className="w-8 h-8 mr-3" />
                  Solicitações de Peças
                </h1>
                <p className="text-gray-600 mt-2">
                  Gerenciamento de solicitações do almoxarifado
                </p>
              </div>
            </div>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Solicitação
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Solicitações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{estatisticas.pendentes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Em Separação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{estatisticas.emSeparacao}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Atendidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{estatisticas.atendidas}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por peça, OS, código ou responsável..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="em_separacao">Em Separação</option>
                  <option value="atendida">Atendidas</option>
                  <option value="cancelada">Canceladas</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Solicitações */}
        <div className="space-y-4">
          {solicitacoesFiltradas.map((solicitacao) => (
            <Card key={solicitacao.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg flex items-center">
                        {getStatusIcon(solicitacao.status)}
                        <span className="ml-2">#{solicitacao.id} - {solicitacao.peca_nome}</span>
                      </CardTitle>
                      <Badge className={getStatusColor(solicitacao.status)}>
                        {solicitacao.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getPrioridadeColor(solicitacao.prioridade)}>
                        {solicitacao.prioridade.toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription className="text-base">
                      {solicitacao.descricao}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">Qtd: {solicitacao.quantidade}</div>
                    {solicitacao.peca_codigo && (
                      <div className="text-sm text-gray-500 font-mono">
                        {solicitacao.peca_codigo}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">OS Relacionada:</span>
                    <Link href={`/os/${solicitacao.os_id}`} className="text-blue-600 hover:underline">
                      #{solicitacao.os_id} - {solicitacao.os_titulo}
                    </Link>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Solicitante:</span>
                    <span>{solicitacao.solicitante}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">Técnico:</span>
                    <span className="text-blue-600">{solicitacao.tecnico}</span>
                  </div>
                  {solicitacao.responsavel_almoxarifado && (
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-green-400" />
                      <span className="font-medium">Almoxarifado:</span>
                      <span className="text-green-600">{solicitacao.responsavel_almoxarifado}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Solicitação:</span>
                    <span>{new Date(solicitacao.data_solicitacao).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Atualização:</span>
                    <span>{new Date(solicitacao.data_atualizacao).toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                {solicitacao.observacoes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-sm">Observações:</span>
                    <p className="text-sm text-gray-600 mt-1">{solicitacao.observacoes}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                  {solicitacao.status === 'pendente' && (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Iniciar Separação
                    </Button>
                  )}
                  {solicitacao.status === 'em_separacao' && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Marcar como Atendida
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {solicitacoesFiltradas.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma solicitação de peça encontrada para os filtros selecionados.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
