import { FileText, Download, Calendar, Filter, Share2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ReportsView() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const reports = [
    {
      id: 1,
      title: 'Relatório Mensal - Janeiro 2026',
      description: 'Resumo completo de tickets e performance',
      date: '27/01/2026',
      tickets: 100,
      resolved: 95,
      pending: 5,
    },
    {
      id: 2,
      title: 'Relatório Semanal - Semana 4',
      description: 'Análise da última semana',
      date: '20/01/2026',
      tickets: 28,
      resolved: 26,
      pending: 2,
    },
    {
      id: 3,
      title: 'Relatório por Categoria - Hardware',
      description: 'Tickets relacionados a hardware',
      date: '15/01/2026',
      tickets: 35,
      resolved: 33,
      pending: 2,
    },
  ];

  const topIssues = [
    { issue: 'Problemas de rede', count: 45, trend: '+12%' },
    { issue: 'Mouse não funciona', count: 32, trend: '+8%' },
    { issue: 'Lentidão no sistema', count: 28, trend: '-5%' },
    { issue: 'Impressora offline', count: 22, trend: '+3%' },
    { issue: 'Acesso ao sistema', count: 18, trend: '-2%' },
  ];

  const handleShareReport = (reportTitle: string) => {
    // Simulação do envio via bot
    toast.success(`Relatório "${reportTitle}" encaminhado para o contato salvo via Bot!`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Relatórios</h1>
        <p className="text-slate-400">Visualize e exporte relatórios detalhados</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="text-blue-500" size={24} />
          <h2 className="text-xl font-semibold text-white">Filtros</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-slate-400 text-sm mb-2 block">Período</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Hoje</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="quarter">Trimestre</option>
              <option value="year">Ano</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 text-sm mb-2 block">Categoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="hardware">Hardware</option>
              <option value="software">Software</option>
              <option value="network">Rede</option>
              <option value="infrastructure">Infraestrutura</option>
            </select>
          </div>

          <div className="flex items-end">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
              <Calendar size={20} />
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>

      {/* Available Reports */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Relatórios Disponíveis</h2>
          <button className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2">
            Ver todos
          </button>
        </div>

        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="text-blue-400" size={20} />
                    <h3 className="text-white font-semibold">{report.title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm">{report.description}</p>
                  <p className="text-slate-500 text-xs mt-1">{report.date}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleShareReport(report.title)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                    title="Encaminhar via Bot"
                  >
                    <Share2 size={16} />
                    Encaminhar
                  </button>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
                    <Download size={16} />
                    Baixar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-700/50">
                <div>
                  <div className="text-slate-400 text-xs">Total</div>
                  <div className="text-white font-semibold">{report.tickets}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Resolvidos</div>
                  <div className="text-green-500 font-semibold">{report.resolved}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs">Pendentes</div>
                  <div className="text-yellow-500 font-semibold">{report.pending}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Issues */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Problemas Mais Frequentes</h2>
        
        <div className="space-y-3">
          {topIssues.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="text-2xl font-bold text-slate-600">#{index + 1}</div>
                <div className="flex-1">
                  <div className="text-white font-medium">{item.issue}</div>
                  <div className="text-slate-400 text-sm">{item.count} ocorrências</div>
                </div>
              </div>
              <div className={`text-sm font-semibold ${
                item.trend.startsWith('+') ? 'text-red-400' : 'text-green-400'
              }`}>
                {item.trend}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
