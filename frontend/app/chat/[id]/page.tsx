'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { ticketsAPI, chatsAPI } from '@/lib/api';

interface Message {
  id: number;
  ticket_id: number;
  sender_type: 'customer' | 'bot' | 'technician';
  sender_id: number | null;
  sender_name: string | null;
  content: string;
  message_type: string;
  created_at: string;
}

interface Ticket {
  id: number;
  customer_phone: string;
  customer_name: string | null;
  sector: string | null;
  ticket_type: string | null;
  location: string | null;
  equipment: string | null;
  patrimony: string | null;
  problem: string | null;
  status: string;
  queue_name: string | null;
  assigned_name: string | null;
  created_at: string;
}

export default function ChatPage() {
  const { user, loading } = useAuth();
  const { subscribeToTicket, onTicketMessage } = useSocket();
  const router = useRouter();
  const params = useParams();
  const ticketId = parseInt(params.id as string);
  
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
      loadMessages();
      subscribeToTicket(ticketId);
    }
  }, [ticketId]);

  useEffect(() => {
    const unsubscribe = onTicketMessage(ticketId, (message: Message) => {
      setMessages(prev => [...prev, message]);
    });
    return unsubscribe;
  }, [ticketId, onTicketMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTicket = async () => {
    try {
      const { data } = await ticketsAPI.get(ticketId);
      setTicket(data);
    } catch (error) {
      console.error('Erro ao carregar ticket:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data } = await chatsAPI.messages(ticketId);
      setMessages(data);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { data } = await chatsAPI.send(ticketId, newMessage);
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (confirm('Tem certeza que deseja fechar este ticket?')) {
      try {
        await ticketsAPI.close(ticketId);
        router.push('/dashboard');
      } catch (error) {
        console.error('Erro ao fechar ticket:', error);
      }
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 text-slate-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white">
                Ticket #{ticketId}
              </h1>
              <p className="text-sm text-slate-400">
                📱 {ticket?.customer_phone} • {ticket?.sector || 'Geral'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm font-medium transition"
            >
              ✓ Finalizar
            </button>
          </div>
        </div>
      </header>

      {/* Ticket Info Bar */}
      {ticket && (
        <div className="bg-slate-800/30 border-b border-slate-700 px-4 py-2">
          <div className="max-w-4xl mx-auto flex flex-wrap gap-4 text-sm">
            <span className="text-slate-400">
              <strong className="text-slate-300">Tipo:</strong> {ticket.ticket_type || '-'}
            </span>
            <span className="text-slate-400">
              <strong className="text-slate-300">Local:</strong> {ticket.location || '-'}
            </span>
            <span className="text-slate-400">
              <strong className="text-slate-300">Equipamento:</strong> {ticket.equipment || '-'}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'technician' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.sender_type === 'technician'
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : msg.sender_type === 'bot'
                    ? 'bg-purple-500/20 text-purple-200 rounded-bl-sm border border-purple-500/30'
                    : 'bg-slate-700 text-slate-200 rounded-bl-sm'
                }`}
              >
                {/* Sender Label */}
                {msg.sender_type !== 'technician' && (
                  <p className={`text-xs font-medium mb-1 ${msg.sender_type === 'bot' ? 'text-purple-300' : 'text-slate-400'}`}>
                    {msg.sender_type === 'bot' ? '🤖 Bot' : '👤 Cliente'}
                  </p>
                )}
                
                {/* Message Content */}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                
                {/* Time */}
                <p className={`text-xs mt-1 ${msg.sender_type === 'technician' ? 'text-blue-200' : 'text-slate-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="bg-slate-800/50 backdrop-blur-lg border-t border-slate-700 px-4 py-3">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </footer>
    </div>
  );
}
