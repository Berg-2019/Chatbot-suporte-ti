import { BarChart3, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const ticketsByDay = [
  { day: 'Seg', total: 12, open: 3, closed: 9 },
  { day: 'Ter', total: 15, open: 5, closed: 10 },
  { day: 'Qua', total: 20, open: 8, closed: 12 },
  { day: 'Qui', total: 18, open: 4, closed: 14 },
  { day: 'Sex', total: 22, open: 6, closed: 16 },
  { day: 'Sáb', total: 8, open: 2, closed: 6 },
  { day: 'Dom', total: 5, open: 1, closed: 4 },
];

const ticketsByCategory = [
  { name: 'Hardware', value: 35 },
  { name: 'Software', value: 28 },
  { name: 'Rede', value: 22 },
  { name: 'Infraestrutura', value: 15 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

const responseTime = [
  { hour: '8h', tempo: 5 },
  { hour: '9h', tempo: 8 },
  { hour: '10h', tempo: 12 },
  { hour: '11h', tempo: 15 },
  { hour: '12h', tempo: 10 },
  { hour: '14h', tempo: 18 },
  { hour: '15h', tempo: 20 },
  { hour: '16h', tempo: 14 },
  { hour: '17h', tempo: 9 },
];

export default function MetricsView() {
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
          <div className="text-3xl font-bold text-white mb-1">100</div>
          <div className="text-slate-400 text-sm">Total de Tickets</div>
          <div className="text-green-500 text-xs mt-2">+15% esta semana</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock className="text-orange-500" size={24} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">12min</div>
          <div className="text-slate-400 text-sm">Tempo Médio</div>
          <div className="text-green-500 text-xs mt-2">-3min do mês passado</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="text-green-500" size={24} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">95%</div>
          <div className="text-slate-400 text-sm">Taxa de Resolução</div>
          <div className="text-green-500 text-xs mt-2">+2% esta semana</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <XCircle className="text-red-500" size={24} />
          </div>
          <div className="text-3xl font-bold text-white mb-1">5</div>
          <div className="text-slate-400 text-sm">Tickets Pendentes</div>
          <div className="text-yellow-500 text-xs mt-2">Atenção necessária</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets por Dia */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Tickets por Dia</h2>
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
        </div>

        {/* Tickets por Categoria */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Tickets por Categoria</h2>
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
                {ticketsByCategory.map((entry, index) => (
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
        </div>

        {/* Tempo de Resposta */}
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-white mb-6">Tempo Médio de Resposta (minutos)</h2>
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
        </div>
      </div>
    </div>
  );
}
