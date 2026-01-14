/**
 * Chat Page - Unified conversation view
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { ticketsApi, messagesApi } from '@/lib/api';
import Link from 'next/link';

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
      setTicket(response.data);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Erro ao carregar ticket:', error);
      router.push('/dashboard');
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

  async function handleClose() {
    if (!confirm('Deseja fechar este chamado?')) return;
    
    try {
      await ticketsApi.close(ticketId);
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao fechar ticket:', error);
    }
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
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
            ← Voltar
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">{ticket.title}</h1>
            <p className="text-sm text-gray-500">
              📱 {ticket.phoneNumber} • 📍 {ticket.sector || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-sm rounded-full ${
            ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
            ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {ticket.status === 'IN_PROGRESS' ? 'Em atendimento' : 
             ticket.status === 'CLOSED' ? 'Fechado' : ticket.status}
          </span>
          {ticket.status !== 'CLOSED' && (
            <button
              onClick={handleClose}
              className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm transition"
            >
              Fechar
            </button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Ticket info */}
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300">📋 Descrição do chamado:</p>
          <p className="text-blue-700 dark:text-blue-400 mt-1">{ticket.description}</p>
          <p className="text-blue-600 dark:text-blue-500 text-xs mt-2">
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
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
                msg.direction === 'OUTGOING'
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
              <p className={`text-xs mt-1 ${
                msg.direction === 'OUTGOING' ? 'text-blue-200' : 'text-gray-400'
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
                  <span>Enviar</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
