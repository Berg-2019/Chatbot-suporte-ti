'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, 
  Search, 
  User,
  Calendar,
  ArrowLeft,
  Clock,
  Star,
  Download
} from 'lucide-react';
import Link from 'next/link';

interface OrdemServico {
  id: number;
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  solicitante: string;
  tecnico: string;
  data_abertura: string;
  data_finalizacao: string;
  tempo_resolucao: number; // em horas
  avaliacao?: number; // 1-5 estrelas
  observacoes?: string;
}

const mockOSFinalizadas: OrdemServico[] = [
  {
    id: 3,
    titulo: "Sistema fora do ar",
    descricao: "Sistema principal não estava acessível",
    prioridade: "urgente",
    solicitante: "Pedro Costa",
    tecnico: "Ana Tech",
    data_abertura: "2025-01-01T08:00:00",
    data_finalizacao: "2025-01-01T16:30:00",
    tempo_resolucao: 8.5,
    avaliacao: 5,
    observacoes: "Problema resolvido com sucesso. Sistema funcionando perfeitamente."
  },
  {
    id: 9,
    titulo: "Backup de dados",
    descricao: "Realizar backup completo do servidor",
    prioridade: "media",
    solicitante: "Marcos Silva",
    tecnico: "Carlos Tech",
    data_abertura: "2025-01-02T09:00:00",
    data_finalizacao: "2025-01-02T17:45:00",
    tempo_resolucao: 8.75,
    avaliacao: 4,
    observacoes: "Backup realizado com sucesso. Todos os dados foram preservados."
  },
  {
    id: 10,
    titulo: "Atualização de antivírus",
    descricao: "Atualizar antivírus em todas as máquinas",
    prioridade: "baixa",
    solicitante: "Sandra Oliveira",
    tecnico: "João Tech",
    data_abertura: "2025-01-01T10:30:00",
    data_finalizacao: "2025-01-01T15:20:00",
    tempo_resolucao: 4.83,
    avaliacao: 5,
    observacoes: "Atualização concluída em todas as estações de trabalho."
  },
  {
    id: 11,
    titulo: "Configuração de email",
    descricao: "Configurar conta de email para novo funcionário",
    prioridade: "media",
    solicitante: "RH - Patricia",
    tecnico: "Ana Tech",
    data_abertura: "2025-01-02T14:00:00",
    data_finalizacao: "2025-01-02T15:30:00",
    tempo_resolucao: 1.5,
    avaliacao: 5,
    observacoes: "Email configurado e testado com sucesso."
  }
];

export default function OSFinalizadasPage() {
  const [ordens, setOrdens] = useState<OrdemServico[]>(mockOSFinalizadas);
  const [filtro, setFiltro] = useState('');
  const [filtroData, setFiltroData] = useState('todos'); // todos, hoje, semana, mes

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return 'bg-gray-100 text-gray-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'urgente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTempoResolucaoColor = (horas: number) => {
    if (horas <= 2) return 'text-green-600';
    if (horas <= 8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderEstrelas = (avaliacao?: number) => {
    if (!avaliacao) return <span className="text-gray-400">Não avaliado</span>;
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= avaliacao ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-2">({avaliacao}/5)</span>
      </div>
    );
  };

  const filtrarPorData = (data: string) => {
    const hoje = new Date();
    const dataFinalizacao = new Date(data);
    
    switch (filtroData) {
      case 'hoje':
        return dataFinalizacao.toDateString() === hoje.toDateString();
      case 'semana':
        const semanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        return dataFinalizacao >= semanaAtras;
      case 'mes':
        const mesAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
        return dataFinalizacao >= mesAtras;
      default:
        return true;
    }
  };

  const ordensFiltradas = ordens.filter(os => {
    const matchTexto = os.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
                      os.solicitante.toLowerCase().includes(filtro.toLowerCase()) ||
                      os.tecnico.toLowerCase().includes(filtro.toLowerCase());
    const matchData = filtrarPorData(os.data_finalizacao);
    return matchTexto && matchData;
  });

  const estatisticas = {
    total: ordensFiltradas.length,
    avaliacaoMedia: ordensFiltradas.filter(os => os.avaliacao).length > 0 
      ? (ordensFiltradas.reduce((acc, os) => acc + (os.avaliacao || 0), 0) / 
         ordensFiltradas.filter(os => os.avaliacao).length).toFixed(1)
      : '0',
    tempoMedio: ordensFiltradas.length > 0
      ? (ordensFiltradas.reduce((acc, os) => acc + os.tempo_resolucao, 0) / ordensFiltradas.length).toFixed(1)
      : '0',
    satisfacao: ordensFiltradas.filter(os => (os.avaliacao || 0) >= 4).length
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
                  <CheckCircle className="w-8 h-8 mr-3 text-green-500" />
                  OS Finalizadas
                </h1>
                <p className="text-gray-600 mt-2">
                  Histórico de ordens de serviço concluídas
                </p>
              </div>
            </div>
            <Button className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Exportar Relatório
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Finalizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{estatisticas.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avaliação Média</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{estatisticas.avaliacaoMedia}</div>
              <p className="text-xs text-gray-500">de 5 estrelas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{estatisticas.tempoMedio}h</div>
              <p className="text-xs text-gray-500">de resolução</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Alta Satisfação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{estatisticas.satisfacao}</div>
              <p className="text-xs text-gray-500">≥4 estrelas</p>
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
                    placeholder="Buscar por título, solicitante ou técnico..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os Períodos</option>
                  <option value="hoje">Hoje</option>
                  <option value="semana">Última Semana</option>
                  <option value="mes">Último Mês</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de OS Finalizadas */}
        <div className="space-y-4">
          {ordensFiltradas.map((os) => (
            <Card key={os.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg">#{os.id} - {os.titulo}</CardTitle>
                      <Badge className={getPrioridadeColor(os.prioridade)}>
                        {os.prioridade.toUpperCase()}
                      </Badge>
                      <Badge className="bg-green-100 text-green-800">
                        FINALIZADA
                      </Badge>
                    </div>
                    <CardDescription className="text-base">
                      {os.descricao}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Solicitante:</span>
                    <span>{os.solicitante}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-green-400" />
                    <span className="font-medium">Técnico:</span>
                    <span className="text-green-600 font-medium">{os.tecnico}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Finalização:</span>
                    <span>{new Date(os.data_finalizacao).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Tempo de Resolução:</span>
                    <span className={`font-bold ${getTempoResolucaoColor(os.tempo_resolucao)}`}>
                      {os.tempo_resolucao.toFixed(1)}h
                    </span>
                  </div>
                </div>

                {/* Avaliação */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Avaliação do Solicitante:</span>
                    {renderEstrelas(os.avaliacao)}
                  </div>
                  {os.observacoes && (
                    <p className="text-sm text-gray-600 italic">"{os.observacoes}"</p>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Relatório
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {ordensFiltradas.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma OS finalizada encontrada para os filtros selecionados.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
