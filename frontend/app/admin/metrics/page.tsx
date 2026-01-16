/**
 * Métricas Page - Dashboard com Gráficos
 */

'use client';

import { useEffect, useState } from 'react';
import { metricsApi } from '@/lib/api';
import { BarChart, PieChart, LineChart, ProgressBar } from '@/components/Charts';

interface DashboardData {
    openTickets: number;
    ticketsToday: number;
    pendingTickets: number;
    avgResolutionMinutes: number;
}

interface TechnicianMetrics {
    id: string;
    name: string;
    totalTickets: number;
    closedTickets: number;
    openTickets: number;
    avgResolutionMinutes: number;
    slaCompliance: number;
}

interface SectorMetrics {
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    avgResolutionMinutes: number;
    slaCompliance: number;
    byStatus: { status: string; count: number }[];
    byPriority: { priority: string; count: number }[];
    byCategory: { category: string; count: number }[];
    byTechnician: { name: string; count: number }[];
    timeline: { date: string; opened: number; closed: number }[];
}

type TabType = 'overview' | 'technicians' | 'sector';

export default function MetricsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [technicians, setTechnicians] = useState<TechnicianMetrics[]>([]);
    const [sector, setSector] = useState<SectorMetrics | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [dashRes, techRes, sectorRes] = await Promise.all([
                metricsApi.dashboard(),
                metricsApi.technicians(),
                metricsApi.sector(),
            ]);
            setDashboard(dashRes.data);
            setTechnicians(techRes.data || []);
            setSector(sectorRes.data);
        } catch (error) {
            console.error('Erro ao carregar métricas:', error);
            // Dados de exemplo
            setDashboard({ openTickets: 12, ticketsToday: 5, pendingTickets: 3, avgResolutionMinutes: 45 });
            setTechnicians([
                { id: '1', name: 'João Silva', totalTickets: 50, closedTickets: 45, openTickets: 5, avgResolutionMinutes: 30, slaCompliance: 92 },
                { id: '2', name: 'Maria Santos', totalTickets: 65, closedTickets: 60, openTickets: 5, avgResolutionMinutes: 25, slaCompliance: 95 },
                { id: '3', name: 'Pedro Oliveira', totalTickets: 40, closedTickets: 35, openTickets: 5, avgResolutionMinutes: 40, slaCompliance: 88 },
            ]);
            setSector({
                totalTickets: 155, openTickets: 15, closedTickets: 140, avgResolutionMinutes: 32, slaCompliance: 91,
                byStatus: [{ status: 'Aberto', count: 15 }, { status: 'Em Andamento', count: 8 }, { status: 'Fechado', count: 140 }],
                byPriority: [{ priority: 'Alta', count: 20 }, { priority: 'Média', count: 85 }, { priority: 'Baixa', count: 50 }],
                byCategory: [{ category: 'Hardware', count: 45 }, { category: 'Software', count: 60 }, { category: 'Rede', count: 30 }, { category: 'Outros', count: 20 }],
                byTechnician: [{ name: 'João', count: 50 }, { name: 'Maria', count: 65 }, { name: 'Pedro', count: 40 }],
                timeline: [
                    { date: '01/01', opened: 5, closed: 4 }, { date: '02/01', opened: 8, closed: 6 }, { date: '03/01', opened: 3, closed: 5 },
                    { date: '04/01', opened: 6, closed: 7 }, { date: '05/01', opened: 4, closed: 4 }, { date: '06/01', opened: 7, closed: 8 },
                    { date: '07/01', opened: 5, closed: 5 },
                ],
            });
        } finally {
            setLoading(false);
        }
    }

    function formatTime(minutes: number): string {
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    }

    // Helper para garantir que é um array
    function toArray<T>(data: T[] | undefined | null): T[] {
        return Array.isArray(data) ? data : [];
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: '📊 Visão Geral' },
        { id: 'technicians', label: '👨‍🔧 Técnicos' },
        { id: 'sector', label: '🏢 Setor' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">📊 Métricas e Análises</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">Visualize o desempenho do setor de suporte</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Visão Geral */}
            {activeTab === 'overview' && dashboard && sector && (
                <div className="space-y-6">
                    {/* Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 md:p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg shrink-0">
                                    <span className="text-xl md:text-2xl">📂</span>
                                </div>
                                <div>
                                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{dashboard.openTickets}</p>
                                    <p className="text-xs md:text-sm text-gray-500">Abertos</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                                    <span className="text-xl md:text-2xl">📆</span>
                                </div>
                                <div>
                                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{dashboard.ticketsToday}</p>
                                    <p className="text-xs md:text-sm text-gray-500">Hoje</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
                                    <span className="text-xl md:text-2xl">⏱️</span>
                                </div>
                                <div>
                                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{formatTime(dashboard.avgResolutionMinutes)}</p>
                                    <p className="text-xs md:text-sm text-gray-500">T. Médio</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 md:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg shrink-0">
                                    <span className="text-xl md:text-2xl">✅</span>
                                </div>
                                <div>
                                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{sector.slaCompliance}%</p>
                                    <p className="text-xs md:text-sm text-gray-500">SLA</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Por Status */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tickets por Status</h3>
                            <PieChart
                                data={toArray(sector.byStatus).map(s => ({ label: s.status, value: s.count }))}
                                size={180}
                            />
                        </div>

                        {/* Por Categoria */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tickets por Categoria</h3>
                            <BarChart
                                data={toArray(sector.byCategory).map(c => ({ label: c.category, value: c.count }))}
                                height={180}
                            />
                        </div>

                        {/* Timeline */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 lg:col-span-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timeline - Últimos 7 dias</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">📥 Abertos</p>
                                    <LineChart data={toArray(sector.timeline).map(t => ({ label: t.date, value: t.opened }))} color="#3B82F6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 mb-2">✅ Fechados</p>
                                    <LineChart data={toArray(sector.timeline).map(t => ({ label: t.date, value: t.closed }))} color="#10B981" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Técnicos */}
            {activeTab === 'technicians' && (
                <div className="space-y-6">
                    {/* Cards de Técnicos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {technicians.map(tech => (
                            <div key={tech.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                                        {tech.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{tech.name}</h3>
                                        <p className="text-sm text-gray-500">{tech.totalTickets} tickets</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Abertos</span>
                                        <span className="font-medium text-yellow-600">{tech.openTickets}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Fechados</span>
                                        <span className="font-medium text-green-600">{tech.closedTickets}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Tempo Médio</span>
                                        <span className="font-medium text-blue-600">{formatTime(tech.avgResolutionMinutes)}</span>
                                    </div>
                                    <ProgressBar
                                        value={tech.slaCompliance}
                                        label="SLA"
                                        color={tech.slaCompliance >= 90 ? 'bg-green-500' : tech.slaCompliance >= 75 ? 'bg-yellow-500' : 'bg-red-500'}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Comparativo */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Comparativo de Desempenho</h3>
                        <BarChart
                            data={technicians.map(t => ({ label: t.name, value: t.closedTickets }))}
                            height={200}
                        />
                    </div>
                </div>
            )}

            {/* Setor */}
            {activeTab === 'sector' && sector && (
                <div className="space-y-6">
                    {/* Resumo */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{sector.totalTickets}</p>
                            <p className="text-sm text-gray-500">Total</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                            <p className="text-2xl font-bold text-yellow-600">{sector.openTickets}</p>
                            <p className="text-sm text-gray-500">Abertos</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                            <p className="text-2xl font-bold text-green-600">{sector.closedTickets}</p>
                            <p className="text-sm text-gray-500">Fechados</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                            <p className="text-2xl font-bold text-blue-600">{formatTime(sector.avgResolutionMinutes)}</p>
                            <p className="text-sm text-gray-500">T. Médio</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                            <p className="text-2xl font-bold text-purple-600">{sector.slaCompliance}%</p>
                            <p className="text-sm text-gray-500">SLA</p>
                        </div>
                    </div>

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Por Prioridade</h3>
                            <PieChart
                                data={toArray(sector.byPriority).map(p => ({ label: p.priority, value: p.count }))}
                                size={180}
                            />
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Por Técnico</h3>
                            <BarChart
                                data={toArray(sector.byTechnician).map(t => ({ label: t.name, value: t.count }))}
                                height={180}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
