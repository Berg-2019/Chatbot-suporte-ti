/**
 * Chat Page - Unified conversation view
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { ticketsApi, messagesApi, usersApi } from '@/lib/api';
import Link from 'next/link';
import CloseTicketModal from '@/components/CloseTicketModal';

interface Message {
  id: string;
  content: string;
  direction: 'INCOMING' | 'OUTGOING';
  sender?: { name: string };
  createdAt: string;
}

interface Ticket {
  id: string;
  title: string;
  status: string;
  phoneNumber: string;
  customerName?: string;
  sector?: string;
  description: string;
  createdAt: string;
  assignedTo?: { id: string; name: string };
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function ChatPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const router = useRouter();
  const { user, loading } = useAuth();
  const { subscribeToTicket, unsubscribeFromTicket, on } = useSocket();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (ticketId) {
      loadTicket();
      subscribeToTicket(ticketId);
    }

    return () => {
      if (ticketId) unsubscribeFromTicket(ticketId);
    };
  }, [ticketId]);

  useEffect(() => {
    const cleanup = on('message:new', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });
    return cleanup;
  }, [on]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadTicket() {
    try {
      const response = await ticketsApi.get(ticketId);
      const ticketData = response.data;
      setTicket(ticketData);
      setMessages(ticketData.messages || []);

      // Access Control Check
      if (
        user &&
        user.role !== 'ADMIN' &&
        ticketData.assignedTo &&
        ticketData.assignedTo.id !== user.id
      ) {
        alert('⛔ Acesso Negado: Este chamado está em atendimento por outro técnico.');
        router.push('/dashboard');
      }

    } catch (error) {
      console.error('Erro ao carregar ticket:', error);
      router.push('/dashboard');
    }
  }

  async function loadTechnicians() {
    try {
      const response = await usersApi.technicians();
      // Filtrar o técnico atual
      const filtered = response.data.filter((t: User) => t.id !== ticket?.assignedTo?.id);
      setTechnicians(filtered);
    } catch (error) {
      console.error('Erro ao carregar técnicos:', error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await messagesApi.send(ticketId, newMessage);
      setMessages((prev) => [...prev, response.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  }

  async function handleClose(closeData: {
    solution: string;
    solutionType: string;
    timeWorked: number;
    parts: Array<{
      partId?: string;
      partName: string;
      quantity: number;
      unitCost: number;
      purchased?: boolean;
    }>;
  }) {
    try {
      await ticketsApi.close(ticketId, closeData);
      setShowCloseModal(false);
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao fechar ticket:', error);
      alert('Erro ao fechar chamado');
    }
  }

  async function handleTransfer() {
    if (!selectedTechnician) return;

    setTransferring(true);
    try {
      await ticketsApi.transfer(ticketId, selectedTechnician);
      setShowTransferModal(false);
      await loadTicket(); // Recarregar para atualizar assignedTo
      alert('Chamado transferido com sucesso!');
    } catch (error) {
      console.error('Erro ao transferir:', error);
      alert('Erro ao transferir chamado');
    } finally {
      setTransferring(false);
    }
  }

  function openTransferModal() {
    loadTechnicians();
    setShowTransferModal(true);
  }

  if (loading || !user || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <span className="text-xl">←</span>
            <span className="hidden sm:inline">Voltar</span>
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">{ticket.title}</h1>
            <p className="text-sm text-gray-500">
              📱 {ticket.phoneNumber}
              <span className="hidden sm:inline"> • 📍 {ticket.sector || 'N/A'}</span>
              {ticket.assignedTo && <span className="hidden sm:inline"> • 👤 {ticket.assignedTo.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-sm rounded-full ${ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
            ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-700' :
              ticket.status === 'ASSIGNED' ? 'bg-green-100 text-green-700' :
                'bg-yellow-100 text-yellow-700'
            }`}>
            {ticket.status === 'IN_PROGRESS' ? 'Em atendimento' :
              ticket.status === 'CLOSED' ? 'Fechado' :
                ticket.status === 'ASSIGNED' ? 'Atribuído' : ticket.status}
          </span>
          {ticket.status !== 'CLOSED' && (
            <>
              <button
                onClick={openTransferModal}
                title="Transferir"
                className="px-3 py-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg text-sm transition"
              >
                <span className="hidden sm:inline">🔄 Transferir</span>
                <span className="sm:hidden">🔄</span>
              </button>
              <button
                onClick={() => setShowCloseModal(true)}
                title="Fechar"
                className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm transition"
              >
                <span className="hidden sm:inline">Fechar</span>
                <span className="sm:hidden">✖</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Ticket info */}
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-sm space-y-2">
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-300">👤 Cliente:</p>
            <p className="text-blue-700 dark:text-blue-400">
              {ticket.customerName || 'Não identificado'}
              {ticket.sector && <span className="text-blue-600 dark:text-blue-500"> • {ticket.sector}</span>}
            </p>
          </div>

          <div>
            <p className="font-medium text-blue-800 dark:text-blue-300">📋 Descrição:</p>
            <p className="text-blue-700 dark:text-blue-400">{ticket.description}</p>
          </div>

          <p className="text-blue-600 dark:text-blue-500 text-xs pt-2 border-t border-blue-200 dark:border-blue-800">
            Aberto em: {new Date(ticket.createdAt).toLocaleString('pt-BR')}
          </p>
        </div>

        {/* Messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.direction === 'OUTGOING' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${msg.direction === 'OUTGOING'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none shadow'
                }`}
            >
              {msg.direction === 'OUTGOING' && msg.sender && (
                <p className="text-xs text-blue-200 mb-1">{msg.sender.name}</p>
              )}
              {msg.direction === 'INCOMING' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">👤 Cliente</p>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.direction === 'OUTGOING' ? 'text-blue-200' : 'text-gray-400'
                }`}>
                {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {ticket.status !== 'CLOSED' && (
        <form onSubmit={handleSend} className="bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl transition flex items-center gap-2"
            >
              {sending ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <span className="hidden sm:inline">Enviar</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      )
      }

      {/* Transfer Modal */}
      {
        showTransferModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                🔄 Transferir Chamado
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Selecione o técnico para quem deseja transferir este chamado:
              </p>

              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              >
                <option value="">Selecione um técnico...</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} ({tech.email})
                  </option>
                ))}
              </select>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={!selectedTechnician || transferring}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition"
                >
                  {transferring ? 'Transferindo...' : 'Transferir'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Close Ticket Modal */}
      <CloseTicketModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onSubmit={handleClose}
      />
    </div >
  );
}

