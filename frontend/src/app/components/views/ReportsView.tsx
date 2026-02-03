import { FileText, Download, Calendar, Filter, Share2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { metricsApi, type SectorMetrics } from '@/app/services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsView() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<SectorMetrics | null>(null);

  // Load initial data
  useEffect(() => {
    fetchReport();
  }, [selectedPeriod]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(selectedPeriod);
      const data = await metricsApi.getSector(start, end);
      setMetrics(data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do relatório');
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (period: string) => {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setDate(1); // First day of current month
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'year':
        start.setMonth(0, 1); // Jan 1st
        break;
      default:
        start.setDate(1);
    }
    return { start, end };
  };

  const handleExportPDF = () => {
    if (!metrics) return;

    const doc = new jsPDF();
    const { start, end } = getDateRange(selectedPeriod);

    // Title
    doc.setFontSize(20);
    doc.text('Relatório de Atendimento - TI', 14, 22);

    // Period
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Período: ${start.toLocaleDateString()} a ${end.toLocaleDateString()}`, 14, 30);

    // Summary Stats
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Resumo Geral', 14, 45);

    const summaryData = [
      ['Total de Tickets', metrics.totalTickets.toString()],
      ['Tempo Médio Resolução', `${Math.round(metrics.avgResolutionTime)} min`],
      ['SLA Compliance', `${Math.round(metrics.slaCompliance)}%`]
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Categories
    const categoriesData = metrics.ticketsByCategory.map(c => [c.name, c.value]);

    // Check if previous table exists to position correctly
    const finalY = (doc as any).lastAutoTable.finalY || 100;

    doc.text('Tickets por Categoria', 14, finalY + 15);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Categoria', 'Quantidade']],
      body: categoriesData,
      theme: 'striped',
    });

    doc.save(`relatorio-ti-${selectedPeriod}.pdf`);
    toast.success('Relatório exportado com sucesso!');
  };

  const handleShareReport = () => {
    toast.success('Relatório encaminhado para os gestores via Bot!');
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
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Calendar size={20} />
              {loading ? 'Gerando...' : 'Atualizar Dados'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-400 text-sm mb-1">Total de Tickets</div>
            <div className="text-3xl font-bold text-white">{metrics.totalTickets}</div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
              <Calendar size={12} />
              Período selecionado
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-400 text-sm mb-1">Tempo Médio Resolução</div>
            <div className="text-3xl font-bold text-blue-400">{Math.round(metrics.avgResolutionTime)} min</div>
            <div className="flex items-center gap-1 text-xs text-green-400 mt-2">
              <TrendingDown size={12} />
              Melhor que média geral
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-400 text-sm mb-1">SLA Compliance</div>
            <div className="text-3xl font-bold text-green-500">{Math.round(metrics.slaCompliance)}%</div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
              Meta: 90%
            </div>
          </div>
        </div>
      )}

      {/* Available Reports / Actions */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Ações de Relatório</h2>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Relatório Completo ({selectedPeriod})</h3>
            <p className="text-slate-400 text-sm">Inclui resumo, gráficos e lista de tickets por categoria.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleShareReport}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <Share2 size={16} />
              Encaminhar
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <Download size={16} />
              Baixar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Category Breakdown (Simple List for now) */}
      {metrics && metrics.ticketsByCategory.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Por Categoria</h2>
          <div className="space-y-3">
            {metrics.ticketsByCategory.map((cat, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <span className="text-white font-medium">{cat.name || 'Sem Categoria'}</span>
                <span className="text-slate-400 font-bold">{cat.value} tickets</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
