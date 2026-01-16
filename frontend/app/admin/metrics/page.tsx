/**
 * Metrics Dashboard Page - Métricas e Relatórios
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { metricsApi } from '@/lib/api';
import Link from 'next/link';

interface DashboardSummary {
    openTickets: number;
    ticketsToday: number;
    pendingTickets: number;
    avgResolutionMinutes: number;
}

interface TechnicianMetrics {
    id: string;
    name: string;
    email: string;
    level: string;
    metrics: {
        totalTickets: number;
        openTickets: number;
        closedTickets: number;
        avgResolutionTime: number;
        slaCompliance: number;
        ticketsToday: number;
        ticketsThisWeek: number;
        ticketsThisMonth: number;
    };
}

interface SectorMetrics {
    period: { start: string; end: string };
    summary: {
        totalTickets: number;
        openTickets: number;
        closedTickets: number;
        avgResolutionTime: number;
        slaCompliance: number;
    };
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    byTechnician: { name: string; count: number }[];
    timeline: { date: string; opened: number; closed: number }[];
}

export default function MetricsPage() {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
    const [technicians, setTechnicians] = useState<TechnicianMetrics[]>([]);
    const [sectorData, setSectorData] = useState<SectorMetrics | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'technicians' | 'sector'>('overview');

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    async function loadData() {
        try {
            const [dashRes, techRes, sectorRes] = await Promise.all([
                metricsApi.dashboard(),
                metricsApi.technicians(),
                metricsApi.sector(),
            ]);

            setDashboardData(dashRes.data);
            setTechnicians(techRes.data);
            setSectorData(sectorRes.data);
        } catch (error) {
            console.error('Erro ao carregar métricas:', error);
        } finally {
            setLoadingData(false);
        }
    }

    function formatMinutes(minutes: number): string {
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    }

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="text-2xl">🎫</Link>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Métricas</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition"
                        >
                            ← Dashboard
                        </Link>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {user.name}
                        </span>
                        <button onClick={logout} className="text-sm text-red-600 hover:text-red-700">
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-2 mb-8">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'overview'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                            }`}
                    >
                        📊 Visão Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('technicians')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'technicians'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                            }`}
                    >
                        👨‍💻 Técnicos
                    </button>
                    <button
                        onClick={() => setActiveTab('sector')}
                        className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'sector'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                            }`}
                    >
                        🏢 Setor
                    </button>
                </div>

                {loadingData ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <>
                        {/* Overview Tab */}
                        {activeTab === 'overview' && dashboardData && (
                            <div className="space-y-8">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
                                                <span className="text-2xl">📂</span>
                                            </div>
                                            <div>
                                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardData.openTickets}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Tickets Abertos</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                                                <span className="text-2xl">📆</span>
                                            </div>
                                            <div>
                                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardData.ticketsToday}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Abertos Hoje</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
                                                <span className="text-2xl">⏳</span>
                                            </div>
                                            <div>
                                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboardData.pendingTickets}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Aguardando</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                                                <span className="text-2xl">⏱️</span>
                                            </div>
                                            <div>
                                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatMinutes(dashboardData.avgResolutionMinutes)}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">Tempo Médio</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sector Summary */}
                                {sectorData && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Por Status */}
                                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Por Status</h3>
                                            <div className="space-y-3">
                                                {Object.entries(sectorData.byStatus).map(([status, count]) => (
                                                    <div key={status} className="flex items-center justify-between">
                                                        <span className="text-gray-600 dark:text-gray-400">{status}</span>
                                                        <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Por Prioridade */}
                                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Por Prioridade</h3>
                                            <div className="space-y-3">
                                                {Object.entries(sectorData.byPriority).map(([priority, count]) => (
                                                    <div key={priority} className="flex items-center justify-between">
                                                        <span className={`px-2 py-1 rounded text-sm ${priority === 'HIGH' || priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                                                                priority === 'NORMAL' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                            }`}>{priority}</span>
                                                        <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Technicians Tab */}
                        {activeTab === 'technicians' && (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            👨‍💻 Desempenho dos Técnicos
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Técnico</th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nível</th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Abertos</th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fechados</th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tempo Médio</th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SLA</th>
                                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hoje</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {technicians.map((tech) => (
                                                    <tr key={tech.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white">{tech.name}</p>
                                                                <p className="text-sm text-gray-500">{tech.email}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${tech.level === 'N3' ? 'bg-purple-100 text-purple-700' :
                                                                    tech.level === 'N2' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                                }`}>{tech.level}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-semibold text-gray-900 dark:text-white">
                                                            {tech.metrics.totalTickets}
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-yellow-600">
                                                            {tech.metrics.openTickets}
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-green-600">
                                                            {tech.metrics.closedTickets}
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                                                            {formatMinutes(tech.metrics.avgResolutionTime)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${tech.metrics.slaCompliance >= 90 ? 'bg-green-100 text-green-700' :
                                                                    tech.metrics.slaCompliance >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-red-100 text-red-700'
                                                                }`}>{tech.metrics.slaCompliance}%</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-blue-600 font-semibold">
                                                            {tech.metrics.ticketsToday}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sector Tab */}
                        {activeTab === 'sector' && sectorData && (
                            <div className="space-y-6">
                                {/* Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow text-center">
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{sectorData.summary.totalTickets}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow text-center">
                                        <p className="text-2xl font-bold text-yellow-600">{sectorData.summary.openTickets}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Abertos</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow text-center">
                                        <p className="text-2xl font-bold text-green-600">{sectorData.summary.closedTickets}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Fechados</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow text-center">
                                        <p className="text-2xl font-bold text-blue-600">{formatMinutes(sectorData.summary.avgResolutionTime)}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Tempo Médio</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow text-center">
                                        <p className={`text-2xl font-bold ${sectorData.summary.slaCompliance >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                                            {sectorData.summary.slaCompliance}%
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">SLA</p>
                                    </div>
                                </div>

                                {/* Charts Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Por Categoria */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Por Categoria</h3>
                                        <div className="space-y-3">
                                            {Object.entries(sectorData.byCategory).map(([cat, count]) => {
                                                const total = sectorData.summary.totalTickets || 1;
                                                const pct = Math.round((count / total) * 100);
                                                return (
                                                    <div key={cat}>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="text-gray-600 dark:text-gray-400">{cat}</span>
                                                            <span className="font-medium text-gray-900 dark:text-white">{count} ({pct}%)</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                            <div
                                                                className="bg-blue-600 h-2 rounded-full"
                                                                style={{ width: `${pct}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Por Técnico */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Por Técnico</h3>
                                        <div className="space-y-3">
                                            {sectorData.byTechnician.slice(0, 8).map((tech) => {
                                                const total = sectorData.summary.totalTickets || 1;
                                                const pct = Math.round((tech.count / total) * 100);
                                                return (
                                                    <div key={tech.name}>
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="text-gray-600 dark:text-gray-400">{tech.name}</span>
                                                            <span className="font-medium text-gray-900 dark:text-white">{tech.count}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                            <div
                                                                className="bg-green-600 h-2 rounded-full"
                                                                style={{ width: `${pct}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timeline (Últimos 30 dias)</h3>
                                    <div className="overflow-x-auto">
                                        <div className="flex gap-1 min-w-max">
                                            {sectorData.timeline.map((day) => (
                                                <div key={day.date} className="flex flex-col items-center">
                                                    <div
                                                        className="w-3 bg-blue-500 rounded-t"
                                                        style={{ height: `${Math.max(4, day.opened * 8)}px` }}
                                                        title={`Abertos: ${day.opened}`}
                                                    ></div>
                                                    <div
                                                        className="w-3 bg-green-500 rounded-b"
                                                        style={{ height: `${Math.max(4, day.closed * 8)}px` }}
                                                        title={`Fechados: ${day.closed}`}
                                                    ></div>
                                                    <span className="text-xs text-gray-400 mt-1 rotate-45 origin-left">
                                                        {day.date.slice(5)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-4 mt-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span> Abertos</span>
                                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Fechados</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
