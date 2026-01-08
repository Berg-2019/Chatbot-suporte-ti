'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  AlertCircle, 
  Search, 
  User,
  Calendar,
  ArrowLeft,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface OrdemServico {
  id: number;
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  solicitante: string;
  data_abertura: string;
  tempo_espera: number; // em horas
}

const mockOSAbertas: OrdemServico[] = [
  {
    id: 1,
    titulo: "Problema na impressora",
    descricao: "Impressora não está funcionando no setor administrativo",
    prioridade: "media",
    solicitante: "João Silva",
    data_abertura: "2025-01-03T10:30:00",
    tempo_espera: 2.5
  },
  {
    id: 4,
    titulo: "Teclado com defeito",
    descricao: "Algumas teclas do teclado não funcionam",
    prioridade: "baixa",
    solicitante: "Ana Costa",
    data_abertura: "2025-01-03T08:15:00",
    tempo_espera: 4.8
  },
  {
    id: 5,
    titulo: "Internet instável",
    descricao: "Conexão com internet caindo constantemente",
    prioridade: "alta",
    solicitante: "Roberto Lima",
    data_abertura: "2025-01-03T11:45:00",
    tempo_espera: 1.2
  },
  {
    id: 6,
    titulo: "Sistema de vendas travando",
    descricao: "Sistema trava ao tentar finalizar vendas",
    prioridade: "urgente",
    solicitante: "Carla Mendes",
    data_abertura: "2025-01-03T12:00:00",
    tempo_espera: 1.0
  }
];

export default function OSAbertasPage() {
  const [ordens, setOrdens] = useState<OrdemServico[]>(mockOSAbertas);
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

  const getTempoEsperaColor = (horas: number) => {
    if (horas < 2) return 'text-green-600';
    if (horas < 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const ordensFiltradas = ordens.filter(os => 
    os.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
    os.solicitante.toLowerCase().includes(filtro.toLowerCase())
  );

  // Ordenar por prioridade e tempo de espera
  const ordensOrdenadas = ordensFiltradas.sort((a, b) => {
    const prioridadeOrder = { 'urgente': 4, 'alta': 3, 'media': 2, 'baixa': 1 };
    const prioridadeA = prioridadeOrder[a.prioridade];
    const prioridadeB = prioridadeOrder[b.prioridade];
    
    if (prioridadeA !== prioridadeB) {
      return prioridadeB - prioridadeA; // Maior prioridade primeiro
    }
    
    return b.tempo_espera - a.tempo_espera; // Maior tempo de espera primeiro
  });

  const estatisticas = {
    total: ordens.length,
    urgentes: ordens.filter(os => os.prioridade === 'urgente').length,
    altas: ordens.filter(os => os.prioridade === 'alta').length,
    atrasadas: ordens.filter(os => os.tempo_espera > 4).length
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
                  <AlertCircle className="w-8 h-8 mr-3 text-orange-500" />
                  OS Abertas
                </h1>
                <p className="text-gray-600 mt-2">
                  Ordens de serviço aguardando atendimento
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Abertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{estatisticas.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{estatisticas.urgentes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Alta Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{estatisticas.altas}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Atrasadas (+4h)</CardTitle>
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
              Buscar OS Abertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por título ou solicitante..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de OS Abertas */}
        <div className="space-y-4">
          {ordensOrdenadas.map((os) => (
            <Card key={os.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg">#{os.id} - {os.titulo}</CardTitle>
                      <Badge className={getPrioridadeColor(os.prioridade)}>
                        {os.prioridade.toUpperCase()}
                      </Badge>
                      {os.tempo_espera > 4 && (
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Solicitante:</span>
                    <span>{os.solicitante}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Abertura:</span>
                    <span>{new Date(os.data_abertura).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Tempo de Espera:</span>
                    <span className={`font-bold ${getTempoEsperaColor(os.tempo_espera)}`}>
                      {os.tempo_espera.toFixed(1)}h
                    </span>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Assumir OS
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {ordensOrdenadas.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma OS aberta encontrada.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
