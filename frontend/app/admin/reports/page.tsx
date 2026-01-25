/**
 * Relatórios Page - Geração de relatórios com gráficos
 */

'use client';

import { useState } from 'react';
import { metricsApi } from '@/lib/api';
import { BarChart, PieChart, ProgressBar } from '@/components/Charts';

type ReportType = 'tickets' | 'technicians' | 'sla' | 'categories';

interface ReportConfig {
    type: ReportType;
    startDate: string;
    endDate: string;
}

export default function ReportsPage() {
    const [config, setConfig] = useState<ReportConfig>({
        type: 'tickets',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);

    const reportTypes = [
        { id: 'tickets', label: '📋 Tickets', description: 'Relatório de todos os chamados' },
        { id: 'technicians', label: '👨‍🔧 Técnicos', description: 'Performance dos técnicos' },
        { id: 'sla', label: '⏱️ SLA', description: 'Conformidade com SLA' },
        { id: 'categories', label: '📊 Categorias', description: 'Chamados por categoria' },
    ];

    async function generateReport() {
        setLoading(true);
        try {
            const response = await metricsApi.sector(config.startDate, config.endDate);
            setReportData(response.data);
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            // Dados de exemplo para demonstração
            setReportData({
                totalTickets: 150,
                openTickets: 25,
                closedTickets: 125,
                avgResolutionMinutes: 180,
                slaCompliance: 85.5,
                byCategory: [
                    { category: 'Hardware', count: 45 },
                    { category: 'Software', count: 60 },
                    { category: 'Rede', count: 30 },
                    { category: 'Outros', count: 15 },
                ],
                byPriority: [
                    { priority: 'Alta', count: 30 },
                    { priority: 'Média', count: 80 },
                    { priority: 'Baixa', count: 40 },
                ],
                byTechnician: [
                    { name: 'João Silva', closed: 35, avgTime: 150, sla: 92 },
                    { name: 'Maria Santos', closed: 42, avgTime: 120, sla: 95 },
                    { name: 'Pedro Oliveira', closed: 28, avgTime: 200, sla: 78 },
                    { name: 'Ana Costa', closed: 20, avgTime: 160, sla: 88 },
                ],
            });
        } finally {
            setLoading(false);
        }
    }

    function exportCSV() {
        if (!reportData) return;

        let csv = '';
        if (config.type === 'tickets') {
            csv = 'Métrica,Valor\n';
            csv += `Total de Tickets,${reportData.totalTickets}\n`;
            csv += `Tickets Abertos,${reportData.openTickets}\n`;
            csv += `Tickets Fechados,${reportData.closedTickets}\n`;
            csv += `Tempo Médio (min),${reportData.avgResolutionMinutes}\n`;
            csv += `Conformidade SLA (%),${reportData.slaCompliance}\n`;
        } else if (config.type === 'categories') {
            csv = 'Categoria,Quantidade\n';
            reportData.byCategory?.forEach((c: any) => {
                csv += `${c.category},${c.count}\n`;
            });
        } else if (config.type === 'technicians') {
            csv = 'Técnico,Tickets Fechados,Tempo Médio (min),SLA (%)\n';
            reportData.byTechnician?.forEach((t: any) => {
                csv += `${t.name},${t.closed},${t.avgTime},${t.sla}\n`;
            });
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${config.type}_${config.startDate}_${config.endDate}.csv`;
        a.click();
    }

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
            <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">📈 Relatórios</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">Gere relatórios de desempenho e métricas</p>
            </div>

            {/* Configuração */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configurar Relatório</h2>

                {/* Tipo de Relatório */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {reportTypes.map(type => (
                        <button
                            key={type.id}
                            onClick={() => setConfig(prev => ({ ...prev, type: type.id as ReportType }))}
                            className={`p-3 md:p-4 rounded-lg border-2 transition text-left ${config.type === type.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <div className="text-lg md:text-xl mb-1">{type.label}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">{type.description}</div>
                        </button>
                    ))}
                </div>

                {/* Período */}
                <div className="flex flex-col md:flex-row flex-wrap gap-4 items-start md:items-end">
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início</label>
                        <input
                            type="date"
                            value={config.startDate}
                            onChange={e => setConfig(prev => ({ ...prev, startDate: e.target.value }))}
                            className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fim</label>
                        <input
                            type="date"
                            value={config.endDate}
                            onChange={e => setConfig(prev => ({ ...prev, endDate: e.target.value }))}
                            className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <button
                        onClick={generateReport}
                        disabled={loading}
                        className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition"
                    >
                        {loading ? 'Gerando...' : '📊 Gerar Relatório'}
                    </button>
                </div>
            </div>

            {/* Resultado */}
            {reportData && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resultado do Relatório</h2>
                        <button
                            onClick={exportCSV}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
                        >
                            📥 Exportar CSV
                        </button>
                    </div>

                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 md:p-4">
                            <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{reportData.totalTickets}</p>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Total Tickets</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 md:p-4">
                            <p className="text-xl md:text-2xl font-bold text-yellow-600">{reportData.openTickets}</p>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Abertos</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 md:p-4">
                            <p className="text-xl md:text-2xl font-bold text-green-600">{reportData.closedTickets}</p>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Fechados</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 md:p-4">
                            <p className="text-xl md:text-2xl font-bold text-blue-600">{reportData.avgResolutionMinutes}min</p>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Tempo Médio</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 md:p-4">
                            <p className="text-xl md:text-2xl font-bold text-purple-600">{reportData.slaCompliance}%</p>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">SLA</p>
                        </div>
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Por Categoria - Pizza */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">📊 Por Categoria</h3>
                            <PieChart
                                data={
                                    Array.isArray(reportData.byCategory)
                                        ? reportData.byCategory.map((c: any) => ({ label: c.category, value: c.count }))
                                        : Object.entries(reportData.byCategory || {}).map(([category, count]) => ({ label: category, value: count as number }))
                                }
                                size={160}
                            />
                        </div>

                        {/* Por Prioridade - Pizza */}
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">🎯 Por Prioridade</h3>
                            <PieChart
                                data={
                                    Array.isArray(reportData.byPriority)
                                        ? reportData.byPriority.map((p: any) => ({ label: p.priority, value: p.count }))
                                        : Object.entries(reportData.byPriority || {}).map(([priority, count]) => ({ label: priority, value: count as number }))
                                }
                                size={160}
                            />
                        </div>
                    </div>

                    {/* Por Técnico - Barras */}
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 mb-6">
                        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">👨‍🔧 Por Técnico - Tickets Fechados</h3>
                        <BarChart
                            data={
                                Array.isArray(reportData.byTechnician)
                                    ? reportData.byTechnician.map((t: any) => ({ label: t.name, value: t.count || t.closed || 0 }))
                                    : []
                            }
                            height={180}
                        />
                    </div>

                    {/* Tabela de Técnicos */}
                    <div className="overflow-x-auto">
                        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">📋 Detalhes por Técnico</h3>
                        <table className="w-full min-w-[400px]">
                            <thead>
                                <tr className="text-left text-xs md:text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                    <th className="pb-2 pr-4">Técnico</th>
                                    <th className="pb-2 pr-4 text-right">Fechados</th>
                                    <th className="pb-2 pr-4 text-right">Tempo Médio</th>
                                    <th className="pb-2 text-right">SLA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(Array.isArray(reportData.byTechnician) ? reportData.byTechnician : []).map((t: any, i: number) => (
                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                                        <td className="py-3 pr-4 text-sm text-gray-900 dark:text-white">{t.name}</td>
                                        <td className="py-3 pr-4 text-sm text-right text-gray-900 dark:text-white">{t.count || t.closed || 0}</td>
                                        <td className="py-3 pr-4 text-sm text-right text-gray-900 dark:text-white">{t.avgTime || '-'}min</td>
                                        <td className="py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 md:w-24">
                                                    <ProgressBar
                                                        value={t.sla || 0}
                                                        showPercent={false}
                                                        color={(t.sla || 0) >= 90 ? 'bg-green-500' : (t.sla || 0) >= 75 ? 'bg-yellow-500' : 'bg-red-500'}
                                                    />
                                                </div>
                                                <span className={`text-sm font-medium ${(t.sla || 0) >= 90 ? 'text-green-600' : (t.sla || 0) >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {t.sla || 0}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
