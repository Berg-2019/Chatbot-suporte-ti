/**
 * Admin Dashboard Page - Painel principal administrativo
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { metricsApi, ticketsApi } from '@/lib/api';
import Link from 'next/link';

interface DashboardData {
    openTickets: number;
    ticketsToday: number;
    pendingTickets: number;
    avgResolutionMinutes: number;
}

interface Ticket {
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    customerName?: string;
}

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [dashRes, ticketsRes] = await Promise.all([
                metricsApi.dashboard(),
                ticketsApi.list(),
            ]);

            setDashboard(dashRes.data);
            setRecentTickets(ticketsRes.data.tickets?.slice(0, 5) || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }

    function formatMinutes(minutes: number): string {
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Bem-vindo, {user?.name}! 👋
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Visão geral do sistema de helpdesk
                </p>
            </div>

            {/* Stats Cards */}
            {dashboard && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                <span className="text-2xl">📂</span>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboard.openTickets}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tickets Abertos</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <span className="text-2xl">📆</span>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboard.ticketsToday}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Novos Hoje</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                <span className="text-2xl">⏳</span>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{dashboard.pendingTickets}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Aguardando</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <span className="text-2xl">⏱️</span>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {formatMinutes(dashboard.avgResolutionMinutes)}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tempo Médio</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions + Recent Tickets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Ações Rápidas
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link
                            href="/dashboard"
                            className="flex flex-col items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                        >
                            <span className="text-3xl">💬</span>
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Atender</span>
                        </Link>
                        <Link
                            href="/admin/metrics"
                            className="flex flex-col items-center gap-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition"
                        >
                            <span className="text-3xl">📊</span>
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Métricas</span>
                        </Link>
                        <Link
                            href="/admin/faq"
                            className="flex flex-col items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition"
                        >
                            <span className="text-3xl">📚</span>
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">FAQ</span>
                        </Link>
                        <Link
                            href="/admin/estoque"
                            className="flex flex-col items-center gap-2 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 transition"
                        >
                            <span className="text-3xl">📦</span>
                            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Estoque</span>
                        </Link>
                    </div>
                </div>

                {/* Recent Tickets */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Tickets Recentes
                    </h2>
                    <div className="space-y-3">
                        {recentTickets.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum ticket recente</p>
                        ) : (
                            recentTickets.map((ticket) => (
                                <Link
                                    key={ticket.id}
                                    href={`/chat/${ticket.id}`}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {ticket.title}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(ticket.createdAt).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full ${ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-600' :
                                            ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                                ticket.status === 'OPEN' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-600'
                                        }`}>
                                        {ticket.status}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
