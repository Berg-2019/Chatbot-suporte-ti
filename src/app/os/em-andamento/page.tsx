'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, 
  Search, 
  User,
  Calendar,
  ArrowLeft,
  Clock,
  CheckCircle
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
  data_inicio: string;
  progresso: number; // 0-100
  tempo_estimado: number; // em horas
  tempo_decorrido: number; // em horas
}

const mockOSEmAndamento: OrdemServico[] = [
  {
    id: 2,
    titulo: "Computador lento",
    descricao: "Computador da recepção está muito lento",
    prioridade: "baixa",
    solicitante: "Maria Santos",
    tecnico: "Carlos Tech",
    data_abertura: "2025-01-02T14:15:00",
    data_inicio: "2025-01-03T09:20:00",
    progresso: 65,
    tempo_estimado: 4,
    tempo_decorrido: 2.5
  },
  {
    id: 7,
    titulo: "Instalação de software",
    descricao: "Instalar novo sistema de gestão",
    prioridade: "alta",
    solicitante: "Fernando Oliveira",
    tecnico: "Ana Tech",
    data_abertura: "2025-01-03T08:00:00",
    data_inicio: "2025-01-03T10:30:00",
    progresso: 30,
    tempo_estimado: 6,
    tempo_decorrido: 1.8
  },
  {
    id: 8,
    titulo: "Configuração de rede",
    descricao: "Configurar nova rede Wi-Fi no escritório",
    prioridade: "media",
    solicitante: "Lucia Ferreira",
    tecnico: "João Tech",
    data_abertura: "2025-01-03T07:30:00",
    data_inicio: "2025-01-03T11:00:00",
    progresso: 85,
    tempo_estimado: 3,
    tempo_decorrido: 2.1
  }
];

export default function OSEmAndamentoPage() {
  const [ordens, setOrdens] = useState<OrdemServico[]>(mockOSEmAndamento);
  const [filtro, setFiltro] = useState('');

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return 'bg-gray-100 text-gray-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'urgente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progresso: number) => {
    if (progresso < 30) return 'bg-red-500';
    if (progresso < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTempoRestante = (estimado: number, decorrido: number) => {
    const restante = estimado - decorrido;
    return restante > 0 ? restante.toFixed(1) : '0.0';
  };

  const ordensFiltradas = ordens.filter(os => 
    os.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
    os.solicitante.toLowerCase().includes(filtro.toLowerCase()) ||
    os.tecnico.toLowerCase().includes(filtro.toLowerCase())
  );

  const estatisticas = {
    total: ordens.length,
    quaseConcluidas: ordens.filter(os => os.progresso >= 80).length,
    atrasadas: ordens.filter(os => os.tempo_decorrido > os.tempo_estimado).length,
    progressoMedio: Math.round(ordens.reduce((acc, os) => acc + os.progresso, 0) / ordens.length)
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
                  <Zap className="w-8 h-8 mr-3 text-blue-500" />
                  OS Em Andamento
                </h1>
                <p className="text-gray-600 mt-2">
                  Ordens de serviço sendo atendidas pelos técnicos
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{estatisticas.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Quase Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{estatisticas.quaseConcluidas}</div>
              <p className="text-xs text-gray-500">≥80% progresso</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Progresso Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{estatisticas.progressoMedio}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{estatisticas.atrasadas}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtro */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Buscar OS Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por título, solicitante ou técnico..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de OS Em Andamento */}
        <div className="space-y-4">
          {ordensFiltradas.map((os) => (
            <Card key={os.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg">#{os.id} - {os.titulo}</CardTitle>
                      <Badge className={getPrioridadeColor(os.prioridade)}>
                        {os.prioridade.toUpperCase()}
                      </Badge>
                      {os.progresso >= 80 && (
                        <Badge className="bg-green-100 text-green-800">
                          QUASE PRONTA
                        </Badge>
                      )}
                      {os.tempo_decorrido > os.tempo_estimado && (
                        <Badge className="bg-red-100 text-red-800">
                          ATRASADA
                        </Badge>
                      )}
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
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">Técnico:</span>
                    <span className="text-blue-600 font-medium">{os.tecnico}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Início:</span>
                    <span>{new Date(os.data_inicio).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Tempo Restante:</span>
                    <span className="font-bold">
                      {getTempoRestante(os.tempo_estimado, os.tempo_decorrido)}h
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progresso</span>
                    <span className="text-sm font-bold">{os.progresso}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(os.progresso)}`}
                      style={{ width: `${os.progresso}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                  <Button variant="outline" size="sm">
                    Atualizar Progresso
                  </Button>
                  {os.progresso >= 90 && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Finalizar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {ordensFiltradas.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma OS em andamento encontrada.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
