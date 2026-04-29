import { BarChart3, TrendingUp, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect } from 'react';
import { metricsApi, type SectorMetrics, type DashboardSummary } from '@/app/services/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

export default function MetricsView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [sectorMetrics, setSectorMetrics] = useState<SectorMetrics | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardData, sectorData] = await Promise.all([
          metricsApi.getDashboard(),
          metricsApi.getSector(),
        ]);

        setDashboard(dashboardData);
        setSectorMetrics(sectorData);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
        setError('Erro ao carregar métricas');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  // Fallback data when API returns empty
  const ticketsByDay = sectorMetrics?.ticketsByDay ?? [
    { day: 'Seg', total: 0, open: 0, closed: 0 },
    { day: 'Ter', total: 0, open: 0, closed: 0 },
    { day: 'Qua', total: 0, open: 0, closed: 0 },
    { day: 'Qui', total: 0, open: 0, closed: 0 },
    { day: 'Sex', total: 0, open: 0, closed: 0 },
  ];

  const ticketsByCategory = sectorMetrics?.ticketsByCategory ?? [];
  const responseTime = sectorMetrics?.responseTimeByHour ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Métricas e Análises</h1>
          <p className="text-slate-400">Visualize o desempenho do helpdesk</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <XCircle className="mx-auto text-red-500 mb-4" size={48} />
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Métricas e Análises</h1>
        <p className="text-slate-400">Visualize o desempenho do helpdesk</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="text-blue-500" size={24} />
            <TrendingUp className="text-green-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {sectorMetrics?.totalTickets ?? dashboard?.ticketsToday ?? 0}
          </div>
          <div className="text-slate-400 text-sm">Total de Tickets</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock className="text-orange-500" size={24} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {sectorMetrics?.avgResolutionTime ?? dashboard?.avgResponseTime ?? 0}min
          </div>
          <div className="text-slate-400 text-sm">Tempo Médio</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="text-green-500" size={24} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {sectorMetrics?.slaCompliance ?? dashboard?.slaCompliance ?? 0}%
          </div>
          <div className="text-slate-400 text-sm">SLA Cumprido</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <XCircle className="text-red-500" size={24} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {dashboard?.ticketsOpen ?? 0}
          </div>
          <div className="text-slate-400 text-sm">Tickets Pendentes</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets por Dia */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Tickets por Dia</h2>
          {ticketsByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="closed" stackId="a" fill="#3b82f6" name="Fechados" />
                <Bar dataKey="open" stackId="a" fill="#f59e0b" name="Abertos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Sem dados disponíveis
            </div>
          )}
        </div>

        {/* Tickets por Categoria */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Tickets por Categoria</h2>
          {ticketsByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ticketsByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ticketsByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Sem dados disponíveis
            </div>
          )}
        </div>

        {/* Tempo de Resposta */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-white mb-6">Tempo Médio de Resposta (minutos)</h2>
          {responseTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={responseTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="tempo"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 5 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Sem dados disponíveis
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
