'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Users, 
  FileText, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Zap
} from 'lucide-react';

interface DashboardStats {
  totalOS: number;
  osAbertas: number;
  osEmAndamento: number;
  osFinalizadas: number;
  totalUsuarios: number;
  totalPecas: number;
  tempoMedioResolucao: number;
  osHoje: number;
  tendenciaOS: 'up' | 'down' | 'stable';
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
    status: 'healthy' | 'warning' | 'critical';
  };
}

interface DashboardProps {
  stats: DashboardStats;
  isLoading?: boolean;
}

export function Dashboard({ stats, isLoading = false }: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'critical': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Status do Sistema */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">
            Última atualização: {currentTime.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon(stats.systemHealth.status)}
          <span className={`font-medium ${getStatusColor(stats.systemHealth.status)}`}>
            Sistema {stats.systemHealth.status === 'healthy' ? 'Saudável' : 
                    stats.systemHealth.status === 'warning' ? 'Atenção' : 'Crítico'}
          </span>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de OS */}
        <Link href="/os">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de OS</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOS}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {getTrendIcon(stats.tendenciaOS)}
                <span className="ml-1">Hoje: {stats.osHoje}</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* OS Abertas */}
        <Link href="/os/abertas">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">OS Abertas</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.osAbertas}</div>
              <div className="text-xs text-muted-foreground">
                Aguardando atendimento
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* OS Em Andamento */}
        <Link href="/os/em-andamento">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Zap className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.osEmAndamento}</div>
              <div className="text-xs text-muted-foreground">
                Sendo atendidas
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* OS Finalizadas */}
        <Link href="/os/finalizadas">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.osFinalizadas}</div>
              <div className="text-xs text-muted-foreground">
                Concluídas com sucesso
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Métricas Secundárias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Usuários */}
        <Link href="/usuarios">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
              <div className="text-xs text-muted-foreground">
                Cadastrados no sistema
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Solicitações de Peças */}
        <Link href="/pecas">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solicitações de Peças</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPecas}</div>
              <div className="text-xs text-muted-foreground">
                Pendentes e atendidas
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Tempo Médio de Resolução */}
        <Link href="/tempo-medio">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.tempoMedioResolucao.toFixed(1)}h
              </div>
              <div className="text-xs text-muted-foreground">
                Para resolução de OS
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Status do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Status do Sistema
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real dos recursos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">CPU</span>
              <span className="text-sm text-muted-foreground">
                {stats.systemHealth.cpu}%
              </span>
            </div>
            <Progress value={stats.systemHealth.cpu} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memória</span>
              <span className="text-sm text-muted-foreground">
                {stats.systemHealth.memory}%
              </span>
            </div>
            <Progress value={stats.systemHealth.memory} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Disco</span>
              <span className="text-sm text-muted-foreground">
                {stats.systemHealth.disk}%
              </span>
            </div>
            <Progress value={stats.systemHealth.disk} className="h-2" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Status Geral</span>
            <Badge 
              variant={
                stats.systemHealth.status === 'healthy' ? 'default' :
                stats.systemHealth.status === 'warning' ? 'secondary' : 'destructive'
              }
            >
              {stats.systemHealth.status === 'healthy' ? 'Saudável' :
               stats.systemHealth.status === 'warning' ? 'Atenção' : 'Crítico'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
