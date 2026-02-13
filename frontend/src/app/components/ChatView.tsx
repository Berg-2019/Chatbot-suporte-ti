import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
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
import TransferTicketModal from './modals/TransferTicketModal';
import { toast } from 'sonner';
import { ticketsApi, type Ticket, type Message as ApiMessage } from '@/app/services/api';

interface ChatViewProps {
  ticket: Ticket;
  onClose: () => void;
  onCloseTicket: () => void; // Called when ticket is formally closed
}

interface Message {
  id: string; // Changed to string to match waMessageId/backend ID
  content: string; // Changed from text to content to match backend
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT' | 'VIDEO'; // Explicitly allow all types from backend
  direction: 'INCOMING' | 'OUTGOING'; // Matches backend
  createdAt: string; // Matches backend
  sender?: {
    id: string;
    name: string;
  };
}

export default function ChatView({ ticket, onClose, onCloseTicket }: ChatViewProps) {
  const [messageInput, setMessageInput] = useState(''); // Renamed to avoid conflict with `messages` state
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // --- Socket.IO setup ---
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: localStorage.getItem('authToken') },
    });

    socketRef.current.on('connect', () => {
      console.log(`Connected to Socket.IO for ticket ${ticket.id}`);
      // Join the ticket-specific room
      socketRef.current?.emit('ticket:subscribe', ticket.id);
    });

    socketRef.current.on('message:new', (newMessage: Message) => {
      console.log('Received new message:', newMessage);
      setMessages((prevMessages) => {
        // Prevent duplicates - check by ID
        if (prevMessages.some(msg => msg.id === newMessage.id)) {
          return prevMessages;
        }
        return [...prevMessages, newMessage];
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from Socket.IO');
    });

    // Cleanup on unmount or ticket change
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('ticket:unsubscribe', ticket.id);
        socketRef.current.disconnect();
      }
    };
  }, [ticket.id]); // Reconnect if ticket.id changes

  // --- Fetch initial messages (only once on mount) ---
  useEffect(() => {
    const fetchInitialMessages = async () => {
      if (!ticket.id) return;
      try {
        const data = await ticketsApi.getMessages(ticket.id.toString());
        // Backend Message type is compatible with our local Message interface
        setMessages(data as Message[]);
      } catch (err) {
        console.error('Failed to load initial messages', err);
        toast.error('Erro ao carregar mensagens iniciais.');
      }
    };
    fetchInitialMessages();
  }, [ticket.id]); // Fetch only when ticket.id changes

  // Modal States
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false); // Mocked for now

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const tempId = `temp-${Date.now()}`;

    try {
      // Optimistic update: Add message to state immediately
      const newMessage: Message = {
        id: tempId,
        content: messageInput,
        direction: 'OUTGOING',
        type: 'TEXT',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
      scrollToBottom();

      await ticketsApi.sendMessage(ticket.id.toString(), messageInput);
      setMessageInput('');
    } catch (err) {
      toast.error('Erro ao enviar mensagem');
      // Revert optimistic update if API fails
      setMessages((prev) => prev.filter(msg => msg.id !== tempId));
    }
  };

  const handleCloseTicket = async (data: CloseTicketData) => {
    console.log('Ticket Closed with Data:', data);

    try {
      // Parse timeSpent "Xh Ym" to minutes
      const timeParts = data.timeSpent.match(/(\d+)h\s+(\d+)m/);
      let minutes = 0;
      if (timeParts) {
        minutes = (parseInt(timeParts[1]) * 60) + parseInt(timeParts[2]);
      } else {
        // Fallback or simple parse
        minutes = parseInt(data.timeSpent) || 0;
      }

      // Map details
      const closePayload = {
        solution: data.solution,
        solutionType: data.category,
        timeWorked: minutes,
        saveContact: data.saveContact,
        parts: data.parts.map(p => ({
          partName: p.name,
          quantity: p.quantity,
          unitCost: p.cost,
          purchased: false // Default/assumed
        }))
      };

      await ticketsApi.closeTicket(ticket.id.toString(), closePayload);

      toast.success('Ticket fechado com sucesso!', {
        description: `Tempo: ${data.timeSpent} | Custo: R$ ${data.totalCost.toFixed(2)}`
      });
      setIsCloseModalOpen(false);
      onCloseTicket();

    } catch (err) {
      console.error('Erro ao fechar ticket:', err);
      toast.error('Erro ao fechar ticket. Tente novamente.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      {/* Header Operacional */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 shadow-md z-10">

        {/* Top Bar: Title & Close Drawer */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20">
              {(ticket.customerName || ticket.client || 'CL').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                {ticket.customerName || ticket.client || 'Cliente Desconhecido'}
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Online" />
              </h2>
              <div className="flex items-center text-xs text-slate-400 gap-2">
                <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">#{ticket.ticketNumber || '0000'}</span>
                <span>• {ticket.category || 'Geral'}</span>
                {ticket.sector && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ticket.sector.toLowerCase().includes('elétrica') || ticket.sector.toLowerCase().includes('eletrica')
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                    {ticket.sector}
                  </span>
                )}
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
            <span className="flex items-center gap-1">
              <User size={12} />
              <span className="text-slate-400">Setor:</span>
              <span className="font-medium text-blue-200">{ticket.sector || 'Não informado'}</span>
            </span>
            <span className="flex items-center gap-1">
              <Briefcase size={12} />
              <span className="text-slate-400">Categoria:</span>
              <span className="font-medium text-blue-200">{ticket.category || 'Geral'}</span>
            </span>
            {ticket.location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                <span className="text-slate-400">Local:</span>
                <span className="font-medium text-blue-200">{ticket.location}</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setIsTransferModalOpen(true)}
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
          <span>Chamado iniciado em {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
        </div>

        {messages.map((msg) => {
          const isOutgoing = msg.direction === 'OUTGOING';
          const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          // Prepend API URL if the content is a relative path (e.g., /api/bot/media/...)
          const mediaSrc = msg.content.startsWith('/api/bot/media') ? `${apiUrl}${msg.content}` : msg.content;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${isOutgoing
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                  }`}
              >
                {!isOutgoing && msg.sender?.name && (
                  <div className="text-xs text-slate-400 mb-1 px-1">
                    {msg.sender.name}
                  </div>
                )}
                {msg.type === 'IMAGE' ? (
                  <div className="space-y-2">
                    <img src={mediaSrc} alt="Imagem enviada" className="rounded-lg max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(mediaSrc, '_blank')} />
                  </div>
                ) : msg.type === 'AUDIO' ? (
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <audio controls src={mediaSrc} className="w-full h-8" />
                  </div>
                ) : msg.type === 'VIDEO' ? ( // Handle video type
                  <div className="space-y-2">
                    <video controls src={mediaSrc} className="rounded-lg max-w-full max-h-60 object-cover" />
                  </div>
                ) : msg.type === 'DOCUMENT' ? ( // Handle document type
                  <a href={mediaSrc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-400 hover:underline">
                    <Paperclip size={16} />
                    <span>Download Anexo</span> {/* You might want to extract filename from URL or message for better display */}
                  </a>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}

                <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isOutgoing ? 'text-blue-200' : 'text-slate-500'
                  }`}>
                  {time}
                  {/* Status indicators can be added here if needed, e.g., '✓✓' for delivered */}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
          <button
            type="button"
            onClick={() => toast.info('Anexo de arquivos em breve')}
            className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Anexar arquivo"
          >
            <Paperclip size={20} />
          </button>

          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl flex items-center px-4 py-2 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 h-10" // h-10 to match height properly
            />
          </div>

          <button
            type="submit"
            disabled={!messageInput.trim()}
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

      <TransferTicketModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onConfirm={async (userId) => {
          try {
            await ticketsApi.transfer(ticket.id.toString(), userId);
            toast.success('Chamado transferido com sucesso!');
            setIsTransferModalOpen(false);
            onClose(); // Close chat as user no longer owns it
          } catch (err) {
            toast.error('Erro ao transferir chamado');
          }
        }}
        currentTechnicianId={ticket.technician} // Assuming ticket has technician ID or similar
        ticketTitle={ticket.title}
      />
    </div>
  );
}
