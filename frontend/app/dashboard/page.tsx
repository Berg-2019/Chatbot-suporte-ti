/**
 * Dashboard Page
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { ticketsApi } from '@/lib/api';
import Link from 'next/link';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  phoneNumber: string;
  customerName?: string;
  sector?: string;
  createdAt: string;
  closedAt?: string;
  assignedTo?: { name: string };
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const { on, isConnected } = useSocket();
  const router = useRouter();
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [closedToday, setClosedToday] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

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

  // Listener para novos tickets
  useEffect(() => {
    const cleanup = on('ticket:created', (ticket: Ticket) => {
      setPendingTickets((prev) => [ticket, ...prev]);
    });
    return cleanup;
  }, [on]);

  // Listener para tickets atribuídos/atualizados - recarrega dados
  useEffect(() => {
    const cleanupAssigned = on('ticket:assigned', () => {
      loadData();
    });
    return cleanupAssigned;
  }, [on]);

  useEffect(() => {
    const cleanupUpdated = on('ticket:updated', () => {
      loadData();
    });
    return cleanupUpdated;
  }, [on]);

  async function loadData() {
    try {
      const [pending, all] = await Promise.all([
        ticketsApi.pending(),
        ticketsApi.list(),
      ]);
      
      setPendingTickets(pending.data);
      
      // Meus atendimentos ativos
      const activeTickets = all.data.tickets.filter((t: Ticket) => 
        t.assignedTo && ['ASSIGNED', 'IN_PROGRESS', 'WAITING_CLIENT'].includes(t.status)
      );
      setMyTickets(activeTickets);
      
      // Finalizados hoje
      const today = new Date().toDateString();
      const closedTodayCount = all.data.tickets.filter((t: Ticket) => 
        t.status === 'CLOSED' && t.closedAt && new Date(t.closedAt).toDateString() === today
      ).length;
      setClosedToday(closedTodayCount);
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleAssign(ticketId: string) {
    try {
      await ticketsApi.assign(ticketId);
      loadData();
      router.push(`/chat/${ticketId}`);
    } catch (error) {
      console.error('Erro ao assumir ticket:', error);
    }
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
            <span className="text-2xl">🎫</span>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Helpdesk</h1>
            <span className={`px-2 py-1 text-xs rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isConnected ? '● Online' : '○ Offline'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/estoque"
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition"
            >
              📦 Estoque
            </Link>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {user.name} ({user.role})
            </span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingTickets.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Aguardando</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                <span className="text-2xl">💬</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{myTickets.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Em atendimento</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{closedToday}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Finalizados hoje</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Fila de espera */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                🔔 Fila de Espera
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {loadingData ? (
                <div className="p-6 text-center text-gray-500">Carregando...</div>
              ) : pendingTickets.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Nenhum chamado pendente</div>
              ) : (
                pendingTickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{ticket.title}</p>
                        <p className="text-sm text-gray-500">
                          📱 {ticket.phoneNumber} • 📍 {ticket.sector || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(ticket.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAssign(ticket.id)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                      >
                        Assumir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Meus atendimentos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                💬 Meus Atendimentos
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {loadingData ? (
                <div className="p-6 text-center text-gray-500">Carregando...</div>
              ) : myTickets.length === 0 ? (
                <div className="p-6 text-center text-gray-500">Nenhum atendimento ativo</div>
              ) : (
                myTickets.map((ticket) => (
                  <Link key={ticket.id} href={`/chat/${ticket.id}`}>
                    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{ticket.title}</p>
                          <p className="text-sm text-gray-500">
                            📱 {ticket.phoneNumber}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                          ticket.status === 'WAITING_CLIENT' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {ticket.status === 'IN_PROGRESS' ? 'Em atendimento' :
                           ticket.status === 'WAITING_CLIENT' ? 'Aguardando cliente' :
                           ticket.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
