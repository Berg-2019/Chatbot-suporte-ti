'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { ticketsAPI, botAPI } from '@/lib/api';

interface Ticket {
  id: number;
  customer_phone: string;
  customer_name: string | null;
  sector: string | null;
  ticket_type: string | null;
  problem: string | null;
  status: string;
  queue_name: string | null;
  assigned_name: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const { user, loading, logout, isAdmin } = useAuth();
  const { botStatus, isConnected: socketConnected, onNewTicket } = useSocket();
  const router = useRouter();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pendingTickets, setPendingTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load tickets
  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  // Listen for new tickets
  useEffect(() => {
    const unsubscribe = onNewTicket((ticket: Ticket) => {
      setPendingTickets(prev => [ticket, ...prev]);
    });
    return unsubscribe;
  }, [onNewTicket]);

  const loadTickets = async () => {
    try {
      const [allRes, pendingRes] = await Promise.all([
        ticketsAPI.list(),
        ticketsAPI.pending(),
      ]);
      setTickets(allRes.data);
      setPendingTickets(pendingRes.data);
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleAssign = async (ticketId: number) => {
    try {
      await ticketsAPI.assign(ticketId);
      loadTickets();
      router.push(`/chat/${ticketId}`);
    } catch (error) {
      console.error('Erro ao assumir ticket:', error);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const myTickets = tickets.filter(t => t.status === 'in_progress');
  const waitingTickets = pendingTickets.filter(t => t.status === 'waiting');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Helpdesk TI</h1>
                <p className="text-sm text-slate-400">Olá, {user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Bot Status */}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${botStatus?.connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm text-slate-300">
                  {botStatus?.connected ? 'WhatsApp conectado' : 'WhatsApp offline'}
                </span>
              </div>

              {/* Admin Settings */}
              {isAdmin && (
                <button
                  onClick={() => router.push('/settings')}
                  className="p-2 text-slate-400 hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}

              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{waitingTickets.length}</p>
                <p className="text-sm text-slate-400">Aguardando</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{myTickets.length}</p>
                <p className="text-sm text-slate-400">Em atendimento</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{tickets.filter(t => t.status === 'closed').length}</p>
                <p className="text-sm text-slate-400">Finalizados hoje</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${botStatus?.connected ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-xl flex items-center justify-center`}>
                <svg className={`w-6 h-6 ${botStatus?.connected ? 'text-green-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{botStatus?.connected ? 'Online' : 'Offline'}</p>
                <p className="text-sm text-slate-400">WhatsApp Bot</p>
              </div>
            </div>
          </div>
        </div>

        {/* Two Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Tickets */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">🔔 Fila de Espera</h2>
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
                {waitingTickets.length} tickets
              </span>
            </div>
            <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
              {loadingTickets ? (
                <div className="p-8 text-center text-slate-400">Carregando...</div>
              ) : waitingTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p>Nenhum ticket aguardando</p>
                </div>
              ) : (
                waitingTickets.map(ticket => (
                  <div key={ticket.id} className="p-4 hover:bg-slate-700/30 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">#{ticket.id}</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                            {ticket.queue_name || 'Geral'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 truncate">{ticket.problem || ticket.sector || 'Novo chamado'}</p>
                        <p className="text-xs text-slate-500 mt-1">📱 {ticket.customer_phone}</p>
                      </div>
                      <button
                        onClick={() => handleAssign(ticket.id)}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
                      >
                        Atender
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* My Tickets */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">💬 Meus Atendimentos</h2>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                {myTickets.length} ativos
              </span>
            </div>
            <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
              {loadingTickets ? (
                <div className="p-8 text-center text-slate-400">Carregando...</div>
              ) : myTickets.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p>Nenhum atendimento em andamento</p>
                </div>
              ) : (
                myTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => router.push(`/chat/${ticket.id}`)}
                    className="p-4 hover:bg-slate-700/30 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">#{ticket.id}</span>
                          <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                            Em andamento
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 truncate">{ticket.problem || ticket.sector || 'Chamado'}</p>
                        <p className="text-xs text-slate-500 mt-1">📱 {ticket.customer_phone}</p>
                      </div>
                      <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
