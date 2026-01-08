'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Calendar,
  User,
  Target,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

interface TempoResolucao {
  periodo: string;
  tempo_medio: number;
  total_os: number;
  meta: number;
  variacao: number; // percentual de variação em relação ao período anterior
}

interface TecnicoPerformance {
  nome: string;
  tempo_medio: number;
  os_resolvidas: number;
  eficiencia: number; // percentual baseado na meta
}

interface CategoriaResolucao {
  categoria: string;
  tempo_medio: number;
  cor: string;
}

const mockTempoResolucao: TempoResolucao[] = [
  {
    periodo: "Janeiro 2025",
    tempo_medio: 4.2,
    total_os: 45,
    meta: 4.0,
    variacao: -8.5
  },
  {
    periodo: "Dezembro 2024",
    tempo_medio: 4.6,
    total_os: 38,
    meta: 4.0,
    variacao: 12.2
  },
  {
    periodo: "Novembro 2024",
    tempo_medio: 4.1,
    total_os: 42,
    meta: 4.0,
    variacao: -5.3
  },
  {
    periodo: "Outubro 2024",
    tempo_medio: 4.3,
    total_os: 39,
    meta: 4.0,
    variacao: 2.4
  }
];

const mockTecnicosPerformance: TecnicoPerformance[] = [
  {
    nome: "Ana Tech",
    tempo_medio: 3.2,
    os_resolvidas: 18,
    eficiencia: 125
  },
  {
    nome: "Carlos Tech",
    tempo_medio: 4.8,
    os_resolvidas: 15,
    eficiencia: 83
  },
  {
    nome: "João Tech",
    tempo_medio: 4.1,
    os_resolvidas: 12,
    eficiencia: 98
  }
];

const mockCategoriasResolucao: CategoriaResolucao[] = [
  {
    categoria: "Hardware",
    tempo_medio: 5.2,
    cor: "bg-red-500"
  },
  {
    categoria: "Software",
    tempo_medio: 3.8,
    cor: "bg-blue-500"
  },
  {
    categoria: "Rede",
    tempo_medio: 4.5,
    cor: "bg-yellow-500"
  },
  {
    categoria: "Sistema",
    tempo_medio: 6.1,
    cor: "bg-purple-500"
  },
  {
    categoria: "Impressora",
    tempo_medio: 2.3,
    cor: "bg-green-500"
  }
];

export default function TempoMedioPage() {
  const [periodos] = useState<TempoResolucao[]>(mockTempoResolucao);
  const [tecnicos] = useState<TecnicoPerformance[]>(mockTecnicosPerformance);
  const [categorias] = useState<CategoriaResolucao[]>(mockCategoriasResolucao);

  const periodoAtual = periodos[0];
  const metaGlobal = 4.0; // horas

  const getVariacaoColor = (variacao: number) => {
    return variacao < 0 ? 'text-green-600' : 'text-red-600';
  };

  const getVariacaoIcon = (variacao: number) => {
    return variacao < 0 ? 
      <TrendingDown className="w-4 h-4 text-green-600" /> : 
      <TrendingUp className="w-4 h-4 text-red-600" />;
  };

  const getEficienciaColor = (eficiencia: number) => {
    if (eficiencia >= 100) return 'text-green-600';
    if (eficiencia >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const estatisticas = {
    tempoAtual: periodoAtual.tempo_medio,
    meta: metaGlobal,
    variacao: periodoAtual.variacao,
    osResolvidas: periodoAtual.total_os,
    eficienciaGeral: Math.round((metaGlobal / periodoAtual.tempo_medio) * 100)
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
                  <Clock className="w-8 h-8 mr-3" />
                  Tempo Médio de Resolução
                </h1>
                <p className="text-gray-600 mt-2">
                  Análise de performance e tempo de resolução de OS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.tempoAtual}h</div>
              <div className="flex items-center text-xs">
                {getVariacaoIcon(estatisticas.variacao)}
                <span className={`ml-1 ${getVariacaoColor(estatisticas.variacao)}`}>
                  {Math.abs(estatisticas.variacao).toFixed(1)}% vs mês anterior
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Meta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{estatisticas.meta}h</div>
              <div className="text-xs text-gray-500">Objetivo definido</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Eficiência Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getEficienciaColor(estatisticas.eficienciaGeral)}`}>
                {estatisticas.eficienciaGeral}%
              </div>
              <div className="text-xs text-gray-500">Em relação à meta</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">OS Resolvidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{estatisticas.osResolvidas}</div>
              <div className="text-xs text-gray-500">No período atual</div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Tendência */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Tendência por Período
            </CardTitle>
            <CardDescription>
              Evolução do tempo médio de resolução nos últimos meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {periodos.map((periodo, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{periodo.periodo}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-lg font-bold">{periodo.tempo_medio}h</span>
                        <div className="flex items-center">
                          {getVariacaoIcon(periodo.variacao)}
                          <span className={`ml-1 text-sm ${getVariacaoColor(periodo.variacao)}`}>
                            {Math.abs(periodo.variacao).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{periodo.total_os} OS resolvidas</span>
                      <span>Meta: {periodo.meta}h</span>
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={Math.min((periodo.meta / periodo.tempo_medio) * 100, 100)} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Performance por Técnico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Performance por Técnico
              </CardTitle>
              <CardDescription>
                Tempo médio de resolução por técnico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tecnicos.map((tecnico, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{tecnico.nome}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-lg font-bold">{tecnico.tempo_medio}h</span>
                        <Badge className={
                          tecnico.eficiencia >= 100 ? 'bg-green-100 text-green-800' :
                          tecnico.eficiencia >= 80 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {tecnico.eficiencia}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>{tecnico.os_resolvidas} OS resolvidas</span>
                      <span>Meta: {metaGlobal}h</span>
                    </div>
                    <Progress 
                      value={Math.min(tecnico.eficiencia, 100)} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tempo por Categoria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Tempo por Categoria
              </CardTitle>
              <CardDescription>
                Tempo médio de resolução por tipo de problema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categorias.map((categoria, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded ${categoria.cor}`}></div>
                      <span className="font-medium">{categoria.categoria}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold">{categoria.tempo_medio}h</span>
                      {categoria.tempo_medio > metaGlobal ? (
                        <Badge className="bg-red-100 text-red-800">
                          Acima da Meta
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">
                          Dentro da Meta
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meta e Objetivos */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Metas e Objetivos
            </CardTitle>
            <CardDescription>
              Definições de performance e objetivos de melhoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 border rounded-lg">
                <div className="text-3xl font-bold text-blue-600 mb-2">{metaGlobal}h</div>
                <div className="text-sm font-medium mb-1">Meta Atual</div>
                <div className="text-xs text-gray-500">Tempo médio ideal</div>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-2">3.5h</div>
                <div className="text-sm font-medium mb-1">Objetivo 2025</div>
                <div className="text-xs text-gray-500">Meta para o ano</div>
              </div>
              <div className="text-center p-6 border rounded-lg">
                <div className="text-3xl font-bold text-purple-600 mb-2">95%</div>
                <div className="text-sm font-medium mb-1">SLA Desejado</div>
                <div className="text-xs text-gray-500">OS dentro da meta</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
