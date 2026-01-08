'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface OSData {
  mes: string;
  total: number;
  finalizadas: number;
}

interface TecnicoData {
  tecnico_responsavel: string;
  total: number;
  finalizadas: number;
}

interface PecasData {
  status: string;
  total: number;
}

interface ChartsProps {
  osPorMes: OSData[];
  osPorTecnico: TecnicoData[];
  pecasPorStatus: PecasData[];
  tempoMedioResolucao: number;
}

export function Charts({ osPorMes, osPorTecnico, pecasPorStatus, tempoMedioResolucao }: ChartsProps) {
  // Configurações dos gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  // Dados para gráfico de OS por mês
  const osLineData = {
    labels: osPorMes.map(item => {
      const [year, month] = item.mes.split('-');
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', { 
        month: 'short', 
        year: '2-digit' 
      });
    }),
    datasets: [
      {
        label: 'Total de OS',
        data: osPorMes.map(item => item.total),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'OS Finalizadas',
        data: osPorMes.map(item => item.finalizadas),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Dados para gráfico de OS por técnico
  const tecnicoBarData = {
    labels: osPorTecnico.map(item => 
      item.tecnico_responsavel?.split(' ')[0] || 'Sem técnico'
    ),
    datasets: [
      {
        label: 'Total de OS',
        data: osPorTecnico.map(item => item.total),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'OS Finalizadas',
        data: osPorTecnico.map(item => item.finalizadas),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  // Dados para gráfico de peças por status
  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'pendente': 'Pendente',
      'em_separacao': 'Em Separação',
      'atendida': 'Atendida',
      'cancelada': 'Cancelada'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'pendente': '#f59e0b',
      'em_separacao': '#3b82f6',
      'atendida': '#10b981',
      'cancelada': '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const pecasDoughnutData = {
    labels: pecasPorStatus.map(item => getStatusLabel(item.status)),
    datasets: [
      {
        data: pecasPorStatus.map(item => item.total),
        backgroundColor: pecasPorStatus.map(item => getStatusColor(item.status)),
        borderColor: pecasPorStatus.map(item => getStatusColor(item.status)),
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de OS por Mês */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Ordens de Serviço por Mês</CardTitle>
          <CardDescription>
            Evolução das OS criadas e finalizadas nos últimos 12 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Line data={osLineData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de OS por Técnico */}
      <Card>
        <CardHeader>
          <CardTitle>Performance dos Técnicos</CardTitle>
          <CardDescription>
            OS atribuídas e finalizadas por técnico (últimos 30 dias)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Bar data={tecnicoBarData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Peças por Status */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações de Peças</CardTitle>
          <CardDescription>
            Distribuição por status (últimos 30 dias)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Doughnut data={pecasDoughnutData} options={doughnutOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Métricas Adicionais */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Métricas de Performance</CardTitle>
          <CardDescription>
            Indicadores chave de performance do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {tempoMedioResolucao.toFixed(1)}h
              </div>
              <div className="text-sm text-blue-600">Tempo Médio de Resolução</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {osPorMes.length > 0 ? 
                  Math.round((osPorMes.reduce((acc, item) => acc + item.finalizadas, 0) / 
                             osPorMes.reduce((acc, item) => acc + item.total, 0)) * 100) : 0}%
              </div>
              <div className="text-sm text-green-600">Taxa de Resolução</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {osPorTecnico.length}
              </div>
              <div className="text-sm text-purple-600">Técnicos Ativos</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {pecasPorStatus.reduce((acc, item) => acc + item.total, 0)}
              </div>
              <div className="text-sm text-orange-600">Total de Peças</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para gráfico de tempo real
export function RealTimeChart({ data }: { data: number[] }) {
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      chart.data.datasets[0].data = data;
      chart.update('none');
    }
  }, [data]);

  const realTimeData = {
    labels: Array.from({ length: data.length }, (_, i) => `${i + 1}min`),
    datasets: [
      {
        label: 'Atividade',
        data: data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const realTimeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="h-32">
      <Line ref={chartRef} data={realTimeData} options={realTimeOptions} />
    </div>
  );
}
