'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Search, 
  Filter,
  Calendar,
  User,
  Clock,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface OrdemServico {
  id: number;
  titulo: string;
  descricao: string;
  status: 'aberta' | 'em_andamento' | 'finalizada' | 'cancelada';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  solicitante: string;
  tecnico?: string;
  data_abertura: string;
  data_atualizacao: string;
}

const mockOS: OrdemServico[] = [
  {
    id: 1,
    titulo: "Problema na impressora",
    descricao: "Impressora não está funcionando no setor administrativo",
    status: "aberta",
    prioridade: "media",
    solicitante: "João Silva",
    data_abertura: "2025-01-03T10:30:00",
    data_atualizacao: "2025-01-03T10:30:00"
  },
  {
    id: 2,
    titulo: "Computador lento",
    descricao: "Computador da recepção está muito lento",
    status: "em_andamento",
    prioridade: "baixa",
    solicitante: "Maria Santos",
    tecnico: "Carlos Tech",
    data_abertura: "2025-01-02T14:15:00",
    data_atualizacao: "2025-01-03T09:20:00"
  },
  {
    id: 3,
    titulo: "Sistema fora do ar",
    descricao: "Sistema principal não está acessível",
    status: "finalizada",
    prioridade: "urgente",
    solicitante: "Pedro Costa",
    tecnico: "Ana Tech",
    data_abertura: "2025-01-01T08:00:00",
    data_atualizacao: "2025-01-01T16:30:00"
  }
];

export default function OSPage() {
  const [ordens, setOrdens] = useState<OrdemServico[]>(mockOS);
  const [filtro, setFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string>('todos');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta': return 'bg-orange-100 text-orange-800';
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'finalizada': return 'bg-green-100 text-green-800';
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

  const ordensFiltradas = ordens.filter(os => {
    const matchFiltro = os.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
                       os.solicitante.toLowerCase().includes(filtro.toLowerCase());
    const matchStatus = statusFiltro === 'todos' || os.status === statusFiltro;
    return matchFiltro && matchStatus;
  });

  const estatisticas = {
    total: ordens.length,
    abertas: ordens.filter(os => os.status === 'aberta').length,
    emAndamento: ordens.filter(os => os.status === 'em_andamento').length,
    finalizadas: ordens.filter(os => os.status === 'finalizada').length
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
                  <FileText className="w-8 h-8 mr-3" />
                  Ordens de Serviço
                </h1>
                <p className="text-gray-600 mt-2">
                  Gerenciamento completo de ordens de serviço
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Abertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{estatisticas.abertas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{estatisticas.emAndamento}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{estatisticas.finalizadas}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por título ou solicitante..."
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="aberta">Abertas</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="finalizada">Finalizadas</option>
                  <option value="cancelada">Canceladas</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de OS */}
        <div className="space-y-4">
          {ordensFiltradas.map((os) => (
            <Card key={os.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg">#{os.id} - {os.titulo}</CardTitle>
                      <Badge className={getStatusColor(os.status)}>
                        {os.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getPrioridadeColor(os.prioridade)}>
                        {os.prioridade.toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription className="text-base">
                      {os.descricao}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Solicitante:</span>
                    <span>{os.solicitante}</span>
                  </div>
                  {os.tecnico && (
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">Técnico:</span>
                      <span>{os.tecnico}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Abertura:</span>
                    <span>{new Date(os.data_abertura).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex justify-end mt-4 space-x-2">
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                  <Button size="sm">
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {ordensFiltradas.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma ordem de serviço encontrada.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
