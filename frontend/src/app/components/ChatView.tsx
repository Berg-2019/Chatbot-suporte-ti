import { useState, useEffect, useRef } from 'react';
import {
  Send,
  X,
  Paperclip,
  MoreVertical,
  User,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CloseTicketModal, { CloseTicketData } from './modals/CloseTicketModal';
import { toast } from 'sonner';
import { Ticket } from '@/types/ticket';

interface ChatViewProps {
  ticket: Ticket;
  onClose: () => void;
  onCloseTicket: () => void; // Called when ticket is formally closed
}

interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  time: string;
  status?: 'sent' | 'delivered' | 'read';
}

export default function ChatView({ ticket, onClose, onCloseTicket }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Olá, bom dia! Meu computador não está ligando.', sender: 'other', time: '09:41' },
    { id: 2, text: 'Bom dia! Você verificou se o cabo de energia está bem conectado?', sender: 'me', time: '09:42', status: 'read' },
    { id: 3, text: 'Sim, já verifiquei. A luz do monitor acende, mas a torre não dá sinal.', sender: 'other', time: '09:43' },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Modal States
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false); // Mocked for now

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      text: message,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setMessages([...messages, newMessage]);
    setMessage('');

    // Simulate user typing and reply
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, status: 'delivered' } : m));
    }, 1000);
  };

  const handleCloseTicket = (data: CloseTicketData) => {
    console.log('Ticket Closed with Data:', data);
    toast.success('Ticket fechado com sucesso!', {
      description: `Tempo: ${data.timeSpent} | Custo: R$ ${data.totalCost.toFixed(2)}`
    });
    setIsCloseModalOpen(false);
    onCloseTicket();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      {/* Header Operacional */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 shadow-md z-10">
        
        {/* Top Bar: Title & Close Drawer */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20">
              {ticket.client ? ticket.client.substring(0,2).toUpperCase() : 'CL'}
            </div>
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                {ticket.client || 'Cliente Desconhecido'}
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Online" />
              </h2>
              <div className="flex items-center text-xs text-slate-400 gap-2">
                <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">#{ticket.ticketNumber || '0000'}</span>
                <span>• {ticket.category || 'Geral'}</span>
              </div>
            </div>
          </div>
          
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Info Card (Context) */}
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-start">
             <p className="text-sm text-blue-100 line-clamp-2">
               <span className="font-semibold text-blue-400">Problema:</span> {ticket.description || 'Sem descrição detalhada.'}
             </p>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-blue-300/70">
            <span className="flex items-center gap-1"><Briefcase size={12} /> Financeiro</span>
            <span className="flex items-center gap-1"><MapPin size={12} /> Sala 302</span>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => toast.info('Funcionalidade de transferência em desenvolvimento')}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-sm border border-slate-700 transition-colors"
          >
            <RefreshCw size={16} /> Transferir
          </button>
          <button 
            onClick={() => setIsCloseModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400 py-2 rounded-lg text-sm border border-red-900/30 transition-colors"
          >
            <CheckCircle2 size={16} /> Fechar Chamado
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50" style={{ backgroundImage: 'radial-gradient(circle at center, #1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        <div className="text-center text-xs text-slate-600 my-4">
          <span>Chamado iniciado em {ticket.date}</span>
        </div>
        
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.sender === 'me'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
              <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                msg.sender === 'me' ? 'text-blue-200' : 'text-slate-500'
              }`}>
                {msg.time}
                {msg.sender === 'me' && (
                  <span>
                    {msg.status === 'sent' && '✓'}
                    {msg.status === 'delivered' && '✓✓'}
                    {msg.status === 'read' && <span className="text-blue-200">✓✓</span>}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
          <button 
            type="button" 
            className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Anexar arquivo"
          >
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl flex items-center px-4 py-2 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 h-10" // h-10 to match height properly
            />
          </div>

          <button
            type="submit"
            disabled={!message.trim()}
            className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 transition-all hover:scale-105"
          >
            <Send size={20} />
          </button>
        </form>
        <div className="text-center mt-2">
            <span className="text-[10px] text-slate-600">Pressione Enter para enviar</span>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isCloseModalOpen && (
          <CloseTicketModal 
            isOpen={isCloseModalOpen}
            onClose={() => setIsCloseModalOpen(false)}
            onConfirm={handleCloseTicket}
            ticketId={ticket.ticketNumber || ticket.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
