'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ticketsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Ticket {
    id: string;
    glpiId?: number;
    title: string;
    status: string;
    createdAt: string;
    closedAt?: string;
    customerName?: string;
    solution?: string;
}

export default function HistoryPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadHistory();
        }
    }, [user]);

    async function loadHistory() {
        try {
            // Usar a listagem com filtros: assignedTo (me) + status CLOSED/RESOLVED
            // Como a API list pode não suportar múltiplos status, vamos pegar tudo do user e filtrar no front ou pedir CLOSED
            // O endpoint findAll suporta filtros. Vamos tentar passar status=CLOSED
            const response = await ticketsApi.list({
                assignedTo: user!.id,
                status: 'CLOSED'
            });

            setTickets(response.data.tickets || []);
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow px-6 py-4 flex items-center gap-4">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    ← Voltar
                </Link>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    📜 Histórico de Atendimentos
                </h1>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {tickets.length === 0 ? (
                            <li className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                Você ainda não tem tickets finalizados.
                            </li>
                        ) : (
                            tickets.map((ticket) => (
                                <li key={ticket.id}>
                                    <Link href={`/chat/${ticket.id}`} className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition duration-150 ease-in-out">
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                                                    #{ticket.glpiId || ticket.id.slice(-6)} - {ticket.title}
                                                </p>
                                                <div className="ml-2 flex-shrink-0 flex">
                                                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                        {ticket.status}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex">
                                                    <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                        👤 {ticket.customerName || 'Cliente sem nome'}
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                                                    <p>
                                                        Fechado em {ticket.closedAt ? new Date(ticket.closedAt).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </main>
        </div>
    );
}
