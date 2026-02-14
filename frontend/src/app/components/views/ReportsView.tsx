import {
  FileText, Download, Calendar, Package, ClipboardList, ArrowUpCircle,
  ArrowDownCircle, TrendingUp, Star, Clock, Users, Filter, BarChart3
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  reportsApi,
  type TicketClosureReport,
  type StockMovementReport,
  type TicketReportFilters,
  type StockReportFilters,
} from '@/app/services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportTab = 'tickets' | 'stock';
type StockSubTab = 'all' | 'SUPPLY' | 'ASSET' | 'INK';

function formatMinutes(min: number | null): string {
  if (!min) return '—';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? `${m}min` : ''}`;
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// ─── Simple inline bar chart ───────────────────────────────────
function MiniBarChart({ data, labelKey, valueKey, secondaryKey, color, secondaryColor }: {
  data: any[];
  labelKey: string;
  valueKey: string;
  secondaryKey?: string;
  color: string;
  secondaryColor?: string;
}) {
  if (!data.length) return <div className="text-center text-gray-400 py-8">Sem dados no período</div>;
  const max = Math.max(...data.map(d => Math.max(d[valueKey] || 0, d[secondaryKey || valueKey] || 0)), 1);

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2">
      {data.slice(-15).map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-20 text-gray-400 shrink-0 text-right">{d[labelKey]}</span>
          <div className="flex-1 flex gap-0.5 items-center">
            <div
              className="h-5 rounded-r transition-all duration-500"
              style={{ width: `${Math.max((d[valueKey] / max) * 100, 2)}%`, background: color }}
            />
            {secondaryKey && (
              <div
                className="h-5 rounded-r transition-all duration-500"
                style={{ width: `${Math.max((d[secondaryKey] / max) * 100, 2)}%`, background: secondaryColor }}
              />
            )}
          </div>
          <span className="text-gray-300 w-12 text-right shrink-0">
            {d[valueKey]}{secondaryKey ? ` / ${d[secondaryKey]}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsView() {
  const [activeTab, setActiveTab] = useState<ReportTab>('tickets');
  const [stockSubTab, setStockSubTab] = useState<StockSubTab>('all');
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [loading, setLoading] = useState(false);

  // Report data
  const [ticketReport, setTicketReport] = useState<TicketClosureReport | null>(null);
  const [stockReport, setStockReport] = useState<StockMovementReport | null>(null);

  // ─── Fetch data ──────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'tickets') {
        const filters: TicketReportFilters = { startDate, endDate };
        const data = await reportsApi.getTicketReport(filters);
        setTicketReport(data);
      } else {
        const filters: StockReportFilters = {
          startDate,
          endDate,
          ...(stockSubTab !== 'all' ? { category: stockSubTab } : {}),
        };
        const data = await reportsApi.getStockReport(filters);
        setStockReport(data);
      }
    } catch (err: any) {
      toast.error(`Erro ao carregar relatório: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, stockSubTab, startDate, endDate]);

  // ─── PDF Export ──────────────────────────────────────────────
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const title = activeTab === 'tickets' ? 'Relatório de Tickets Fechados' : 'Relatório de Movimentações de Estoque';

    doc.setFontSize(18);
    doc.setTextColor(30, 58, 138);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 28);

    if (activeTab === 'tickets' && ticketReport) {
      const { summary, tickets } = ticketReport;

      // Summary table
      autoTable(doc as any, {
        startY: 35,
        head: [['Métrica', 'Valor']],
        body: [
          ['Total Fechados', summary.totalClosed.toString()],
          ['Tempo Médio', formatMinutes(summary.avgTimeWorked)],
          ['Avaliação Média', summary.avgRating > 0 ? `${summary.avgRating} ⭐` : 'N/A'],
          ['Avaliações', summary.ratedCount.toString()],
        ],
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
      });

      // Tickets detail table
      const lastY = (doc as any).lastAutoTable?.finalY || 70;
      autoTable(doc as any, {
        startY: lastY + 10,
        head: [['Título', 'Técnico', 'Categoria', 'Tempo', 'Avaliação', 'Fechado']],
        body: tickets.map(t => [
          t.title?.substring(0, 30) || '—',
          t.assignedTo?.name || 'N/A',
          t.category || '—',
          formatMinutes(t.timeWorked),
          t.rating ? `${t.rating}/5` : '—',
          formatDate(t.closedAt),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
      });
    } else if (activeTab === 'stock' && stockReport) {
      const { summary, movements } = stockReport;

      autoTable(doc as any, {
        startY: 35,
        head: [['Métrica', 'Valor']],
        body: [
          ['Total Movimentações', summary.totalMovements.toString()],
          ['Total Entradas', summary.totalIn.toString()],
          ['Total Saídas', summary.totalOut.toString()],
          ['Saldo Líquido', summary.netBalance.toString()],
        ],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 9 },
      });

      const lastY = (doc as any).lastAutoTable?.finalY || 70;
      autoTable(doc as any, {
        startY: lastY + 10,
        head: [['Item', 'Tipo', 'Qtd', 'Motivo', 'Data']],
        body: movements.map(m => [
          m.stockItem.name.substring(0, 25),
          m.type === 'IN' ? 'Entrada' : 'Saída',
          Number(m.quantity).toString(),
          m.reason?.substring(0, 30) || '—',
          formatDateTime(m.createdAt),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 8 },
      });
    }

    doc.save(`relatorio_${activeTab}_${startDate}_${endDate}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  // ─── Computed filtered movements for stock sub-tabs ──────────
  const filteredStockMovements = useMemo(() => {
    if (!stockReport) return [];
    if (stockSubTab === 'all') return stockReport.movements;
    return stockReport.movements.filter(m => m.stockItem.category === stockSubTab);
  }, [stockReport, stockSubTab]);

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg-primary, #0f172a)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <BarChart3 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Relatórios</h1>
            <p className="text-sm text-gray-400">Análise detalhada de tickets e estoque</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
            style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}>
            <Calendar size={14} className="text-gray-400" />
            <input type="date" value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-gray-200 text-sm outline-none w-32" />
            <span className="text-gray-500">a</span>
            <input type="date" value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-gray-200 text-sm outline-none w-32" />
          </div>

          <button onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'rgba(59,130,246,.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.3)' }}
            disabled={loading}
          >
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'tickets'
              ? 'text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200'
            }`}
          style={activeTab === 'tickets' ? { background: 'linear-gradient(135deg, #3b82f6, #6366f1)' } : {}}
        >
          <ClipboardList size={16} /> Tickets Fechados
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'stock'
              ? 'text-white shadow-lg'
              : 'text-gray-400 hover:text-gray-200'
            }`}
          style={activeTab === 'stock' ? { background: 'linear-gradient(135deg, #10b981, #06b6d4)' } : {}}
        >
          <Package size={16} /> Estoque — Movimentações
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 rounded-full"
            style={{ borderColor: 'rgba(255,255,255,.1)', borderTopColor: '#3b82f6' }} />
        </div>
      )}

      {/* ═══ TICKETS TAB ═══ */}
      {!loading && activeTab === 'tickets' && ticketReport && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard icon={<ClipboardList size={18} />} label="Total Fechados"
              value={ticketReport.summary.totalClosed} color="#3b82f6" />
            <SummaryCard icon={<Clock size={18} />} label="Tempo Médio"
              value={formatMinutes(ticketReport.summary.avgTimeWorked)} color="#f59e0b" />
            <SummaryCard icon={<Star size={18} />} label="Avaliação Média"
              value={ticketReport.summary.avgRating > 0 ? `${ticketReport.summary.avgRating} ⭐` : 'N/A'} color="#8b5cf6" />
            <SummaryCard icon={<Users size={18} />} label="Avaliações"
              value={ticketReport.summary.ratedCount} color="#10b981" />
          </div>

          {/* Charts row */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* By day chart */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <TrendingUp size={14} className="text-blue-400" /> Tickets por Dia
              </h3>
              <MiniBarChart
                data={ticketReport.aggregates.byDay.map(d => ({ ...d, label: d.date.slice(5) }))}
                labelKey="label" valueKey="total" color="#3b82f6" />
            </div>

            {/* By technician */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Users size={14} className="text-purple-400" /> Por Técnico
              </h3>
              <MiniBarChart
                data={ticketReport.aggregates.byTechnician}
                labelKey="name" valueKey="count" color="#8b5cf6" />
            </div>
          </div>

          {/* By category and by solution type */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">📂 Por Categoria</h3>
              <MiniBarChart data={ticketReport.aggregates.byCategory}
                labelKey="name" valueKey="count" color="#f59e0b" />
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
              <h3 className="text-sm font-semibold text-gray-300 mb-3">🔧 Por Tipo de Solução</h3>
              <MiniBarChart data={ticketReport.aggregates.bySolutionType}
                labelKey="name" valueKey="count" color="#10b981" />
            </div>
          </div>

          {/* Tickets table */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
            <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
              <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <FileText size={14} /> Detalhamento ({ticketReport.tickets.length} tickets)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,.04)' }}>
                    <th className="text-left p-3 text-gray-400 font-medium">Título</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Técnico</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Categoria</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Solução</th>
                    <th className="text-center p-3 text-gray-400 font-medium">Tempo</th>
                    <th className="text-center p-3 text-gray-400 font-medium">Nota</th>
                    <th className="text-left p-3 text-gray-400 font-medium">Fechado</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketReport.tickets.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-500">Nenhum ticket fechado no período</td></tr>
                  )}
                  {ticketReport.tickets.map(t => (
                    <tr key={t.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,.04)' }}>
                      <td className="p-3 text-gray-200 max-w-[200px] truncate">{t.title}</td>
                      <td className="p-3 text-gray-300">{t.assignedTo?.name || '—'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: 'rgba(59,130,246,.15)', color: '#93c5fd' }}>
                          {t.category || '—'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 max-w-[150px] truncate">{t.solutionType || '—'}</td>
                      <td className="p-3 text-center text-gray-300">{formatMinutes(t.timeWorked)}</td>
                      <td className="p-3 text-center">
                        {t.rating ? (
                          <span className="text-amber-400">{t.rating}★</span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="p-3 text-gray-400">{formatDate(t.closedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STOCK TAB ═══ */}
      {!loading && activeTab === 'stock' && (
        <div className="space-y-6">
          {/* Stock sub-tabs */}
          <div className="flex gap-1 flex-wrap">
            {[
              { key: 'all' as StockSubTab, label: '📊 Geral' },
              { key: 'SUPPLY' as StockSubTab, label: '🔧 Insumos' },
              { key: 'ASSET' as StockSubTab, label: '🏷️ Patrimônio' },
              { key: 'INK' as StockSubTab, label: '🖨️ Tintas e Toners' },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setStockSubTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${stockSubTab === tab.key
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                  }`}
                style={stockSubTab === tab.key
                  ? { background: 'rgba(16,185,129,.2)', border: '1px solid rgba(16,185,129,.4)' }
                  : { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {stockReport && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard icon={<BarChart3 size={18} />} label="Total Movimentações"
                  value={stockReport.summary.totalMovements} color="#06b6d4" />
                <SummaryCard icon={<ArrowUpCircle size={18} />} label="Total Entradas"
                  value={stockReport.summary.totalIn} color="#10b981" />
                <SummaryCard icon={<ArrowDownCircle size={18} />} label="Total Saídas"
                  value={stockReport.summary.totalOut} color="#ef4444" />
                <SummaryCard icon={<TrendingUp size={18} />} label="Saldo Líquido"
                  value={stockReport.summary.netBalance} color={stockReport.summary.netBalance >= 0 ? '#10b981' : '#ef4444'} />
              </div>

              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-400" /> Entradas vs Saídas por Dia
                  </h3>
                  <MiniBarChart
                    data={stockReport.aggregates.byDay.map(d => ({ ...d, label: d.date.slice(5) }))}
                    labelKey="label" valueKey="totalIn" secondaryKey="totalOut"
                    color="#10b981" secondaryColor="#ef4444" />
                  <div className="flex items-center gap-4 mt-3 text-[11px]">
                    <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: '#10b981' }} /> Entrada</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: '#ef4444' }} /> Saída</span>
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Package size={14} className="text-cyan-400" /> Saldo por Item
                  </h3>
                  <MiniBarChart
                    data={stockReport.aggregates.byItem.slice(0, 10)}
                    labelKey="name" valueKey="totalIn" secondaryKey="totalOut"
                    color="#10b981" secondaryColor="#ef4444" />
                </div>
              </div>

              {/* Movements table */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                  <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <FileText size={14} /> Movimentações ({filteredStockMovements.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,.04)' }}>
                        <th className="text-left p-3 text-gray-400 font-medium">Item</th>
                        <th className="text-center p-3 text-gray-400 font-medium">Tipo</th>
                        <th className="text-center p-3 text-gray-400 font-medium">Qtd</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Motivo</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Categoria</th>
                        <th className="text-left p-3 text-gray-400 font-medium">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStockMovements.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-12 text-gray-500">Nenhuma movimentação no período</td></tr>
                      )}
                      {filteredStockMovements.map(m => (
                        <tr key={m.id} className="border-t" style={{ borderColor: 'rgba(255,255,255,.04)' }}>
                          <td className="p-3 text-gray-200 max-w-[200px] truncate">
                            {m.stockItem.name}
                            {m.stockItem.code && <span className="text-gray-500 ml-1">({m.stockItem.code})</span>}
                          </td>
                          <td className="p-3 text-center">
                            {m.type === 'IN' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ background: 'rgba(16,185,129,.15)', color: '#34d399' }}>
                                <ArrowUpCircle size={10} /> Entrada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ background: 'rgba(239,68,68,.15)', color: '#f87171' }}>
                                <ArrowDownCircle size={10} /> Saída
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center text-gray-300 font-mono">{Number(m.quantity)}</td>
                          <td className="p-3 text-gray-400 max-w-[200px] truncate">{m.reason || '—'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{
                                background: m.stockItem.category === 'SUPPLY' ? 'rgba(59,130,246,.15)' :
                                  m.stockItem.category === 'ASSET' ? 'rgba(139,92,246,.15)' : 'rgba(245,158,11,.15)',
                                color: m.stockItem.category === 'SUPPLY' ? '#93c5fd' :
                                  m.stockItem.category === 'ASSET' ? '#c4b5fd' : '#fcd34d',
                              }}>
                              {m.stockItem.category === 'SUPPLY' ? 'Insumo' :
                                m.stockItem.category === 'ASSET' ? 'Patrimônio' : 'Tinta/Toner'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-400">{formatDateTime(m.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary Card Component ────────────────────────────────────
function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl p-4 transition-all hover:scale-[1.02]"
      style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
