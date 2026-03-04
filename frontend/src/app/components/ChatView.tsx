import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  Code2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Pause,
  User,
  Briefcase,
  MapPin,
  CheckCheck,
  RefreshCw,
  X,
  UserPlus,
  Expand,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CloseTicketModal, { CloseTicketData } from './modals/CloseTicketModal';
import TransferTicketModal from './modals/TransferTicketModal';
import { toast } from 'sonner';
import { ticketsApi, usersApi, type Ticket, type Message as ApiMessage } from '@/app/services/api';

interface ChatViewProps {
  ticket: Ticket;
  onClose: () => void;
  onCloseTicket: () => void;
}

interface Message {
  id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT' | 'VIDEO';
  direction: 'INCOMING' | 'OUTGOING';
  createdAt: string;
  isInternal?: boolean;
  mentions?: string[];
  sender?: {
    id: string;
    name: string;
  };
}

// Agente para autocomplete de @menções
interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
}

type InputMode = 'reply' | 'private';

export default function ChatView({ ticket, onClose, onCloseTicket }: ChatViewProps) {
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('reply');
  const [showResolveDropdown, setShowResolveDropdown] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);

  // @Mentions state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null); // null = dropdown fechado
  const [mentionResults, setMentionResults] = useState<Agent[]>([]);
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([]);
  const [mentionHighlight, setMentionHighlight] = useState(0);

  // Socket.IO setup
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_API_URL || '';
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: localStorage.getItem('authToken') },
    });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('ticket:subscribe', ticket.id);
    });

    socketRef.current.on('message:new', (newMessage: Message) => {
      setMessages((prevMessages) => {
        if (prevMessages.some(msg => msg.id === newMessage.id)) return prevMessages;
        return [...prevMessages, newMessage];
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from Socket.IO');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('ticket:unsubscribe', ticket.id);
        socketRef.current.disconnect();
      }
    };
  }, [ticket.id]);

  // Buscar agentes para @mentions
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const users = await usersApi.getAll();
        setAgents(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
      } catch (err) {
        console.error('Erro ao buscar agentes para @mentions', err);
      }
    };
    fetchAgents();
  }, []);

  // Fetch initial messages
  useEffect(() => {
    const fetchInitialMessages = async () => {
      if (!ticket.id) return;
      try {
        const data = await ticketsApi.getMessages(ticket.id.toString());
        setMessages(data as Message[]);
      } catch (err) {
        console.error('Failed to load initial messages', err);
        toast.error('Erro ao carregar mensagens iniciais.');
      }
    };
    fetchInitialMessages();
  }, [ticket.id]);

  // Modal States
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const isInternal = inputMode === 'private';
    const currentInput = messageInput;
    const currentMentions = selectedMentionIds;

    // Clear input immediately for better UX
    setMessageInput('');
    setSelectedMentionIds([]);
    setMentionSearch(null);

    try {
      // API call will trigger a socket event which will append the message
      await ticketsApi.sendMessage(ticket.id.toString(), currentInput, isInternal, currentMentions);
    } catch (err) {
      toast.error('Erro ao enviar mensagem');
      // Restore input if it failed
      setMessageInput(currentInput);
      setSelectedMentionIds(currentMentions);
    }
  };

  // Detectar @ no textarea e abrir menção
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageInput(val);

    // Detectar @searchTerm
    const cursorPos = e.target.selectionStart || 0;
    const textBefore = val.substring(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);

    if (atMatch) {
      const search = atMatch[1].toLowerCase();
      setMentionSearch(search);
      const filtered = agents.filter(a =>
        a.name.toLowerCase().includes(search) ||
        a.email.toLowerCase().includes(search)
      ).slice(0, 5);
      setMentionResults(filtered);
      setMentionHighlight(0);
    } else {
      setMentionSearch(null);
      setMentionResults([]);
    }
  };

  // Inserir menção selecionada no texto
  const insertMention = (agent: Agent) => {
    const cursorPos = textareaRef.current?.selectionStart || messageInput.length;
    const textBefore = messageInput.substring(0, cursorPos);
    const textAfter = messageInput.substring(cursorPos);
    const atIndex = textBefore.lastIndexOf('@');
    const newText = textBefore.substring(0, atIndex) + `@${agent.name} ` + textAfter;
    setMessageInput(newText);
    setSelectedMentionIds(prev => [...new Set([...prev, agent.id])]);
    setMentionSearch(null);
    setMentionResults([]);
    textareaRef.current?.focus();
  };

  const handleCloseTicket = async (data: CloseTicketData) => {
    try {
      const timeParts = data.timeSpent.match(/(\d+)h\s+(\d+)m/);
      let minutes = 0;
      if (timeParts) {
        minutes = (parseInt(timeParts[1]) * 60) + parseInt(timeParts[2]);
      } else {
        minutes = parseInt(data.timeSpent) || 0;
      }

      const closePayload = {
        solution: data.solution,
        solutionType: data.category,
        timeWorked: minutes,
        saveContact: data.saveContact,
        parts: data.parts.map(p => ({
          partName: p.name,
          quantity: p.quantity,
          unitCost: p.cost,
          purchased: false
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Se o dropdown de menções está aberto, tratar navegação
    if (mentionSearch !== null && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionHighlight(prev => Math.min(prev + 1, mentionResults.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionHighlight(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionResults[mentionHighlight]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionSearch(null);
        return;
      }
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage(e);
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const isPrivateMode = inputMode === 'private';

  return (
    <div className="flex flex-col h-full relative" style={{ backgroundColor: 'var(--cw-bg-primary)' }}>
      {/* Chatwoot-style Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          backgroundColor: 'var(--cw-bg-secondary)',
          borderColor: 'var(--cw-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="md:hidden p-1.5 -ml-2 rounded-lg transition-colors"
            style={{ color: 'var(--cw-text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ChevronLeft size={20} />
          </button>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            {(ticket.customerName || ticket.client || 'CL').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-[14px] font-semibold leading-tight" style={{ color: 'var(--cw-text-primary)' }}>
              {ticket.customerName || ticket.client || 'Cliente'}
            </h3>
            <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--cw-text-tertiary)' }}>
              {ticket.category && <span>{ticket.category}</span>}
              {ticket.sector && (
                <>
                  <span>•</span>
                  <span>{ticket.sector}</span>
                </>
              )}
              {ticket.ticketNumber && (
                <>
                  <span>•</span>
                  <span>#{ticket.ticketNumber.split('-').pop()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Resolver button (Chatwoot-style) */}
          <div className="relative">
            <div className="flex items-center">
              <button
                onClick={() => setIsCloseModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg text-[13px] font-medium text-white transition-colors"
                style={{ backgroundColor: 'var(--cw-resolve-btn)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cw-accent-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--cw-resolve-btn)'}
              >
                Resolver
              </button>
              <button
                onClick={() => setShowResolveDropdown(!showResolveDropdown)}
                className="flex items-center px-1.5 py-1.5 rounded-r-lg text-white border-l border-white/20 transition-colors"
                style={{ backgroundColor: 'var(--cw-resolve-btn)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cw-accent-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--cw-resolve-btn)'}
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Dropdown */}
            {showResolveDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowResolveDropdown(false)} />
                <div
                  className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-xl z-50 py-1 border"
                  style={{
                    backgroundColor: 'var(--cw-bg-tertiary)',
                    borderColor: 'var(--cw-border)',
                  }}
                >
                  <button
                    onClick={() => {
                      setShowResolveDropdown(false);
                      toast.info('Chamado adiado');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-[13px] transition-colors"
                    style={{ color: 'var(--cw-text-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Clock size={14} />
                    Adiar
                  </button>
                  <button
                    onClick={() => {
                      setShowResolveDropdown(false);
                      toast.info('Chamado pendente');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-[13px] transition-colors"
                    style={{ color: 'var(--cw-text-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Pause size={14} />
                    Deixar pendente
                  </button>
                  <button
                    onClick={() => {
                      setShowResolveDropdown(false);
                      setIsTransferModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-[13px] transition-colors"
                    style={{ color: 'var(--cw-text-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <RefreshCw size={14} />
                    Transferir
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Contact info toggle */}
          <button
            onClick={() => setShowContactPanel(!showContactPanel)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--cw-text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Info do contato"
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {/* Main area: messages + optional contact panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          <div
            className="flex-1 overflow-y-auto px-6 py-4 space-y-3"
            style={{ backgroundColor: 'var(--cw-bg-chat)' }}
          >
            {/* Date separator */}
            <div className="text-center my-3">
              <span
                className="text-[11px] px-3 py-1 rounded-full"
                style={{
                  backgroundColor: 'var(--cw-bg-tertiary)',
                  color: 'var(--cw-text-tertiary)',
                }}
              >
                {new Date(ticket.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            {messages.map((msg) => {
              const isOutgoing = msg.direction === 'OUTGOING';
              const isInternal = msg.isInternal === true;
              const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const apiUrl = import.meta.env.VITE_API_URL || '';
              const mediaSrc = msg.content.startsWith('/api/bot/media') ? `${apiUrl}${msg.content}` : msg.content;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Incoming: avatar on left */}
                  {!isOutgoing && (
                    <div
                      className="w-7 h-7 min-w-[28px] rounded-full flex items-center justify-center text-white text-[10px] font-semibold mr-2 mt-1"
                      style={{ background: isInternal ? 'linear-gradient(135deg, #D97706, #B45309)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                    >
                      {isInternal ? <Lock size={12} /> : (msg.sender?.name || ticket.customerName || 'CL').substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] rounded-xl px-3.5 py-2.5 ${isOutgoing ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    style={{
                      backgroundColor: isInternal
                        ? 'var(--cw-private-bg, #FEF3C7)'
                        : isOutgoing ? 'var(--cw-bubble-outgoing)' : 'var(--cw-bubble-incoming)',
                      border: isInternal
                        ? '1px solid var(--cw-private-border, #FCD34D)'
                        : isOutgoing ? 'none' : '1px solid var(--cw-border)',
                      color: isInternal
                        ? 'var(--cw-private-text, #92400E)'
                        : isOutgoing ? 'var(--cw-bubble-outgoing-text)' : 'var(--cw-bubble-incoming-text)',
                    }}
                  >
                    {/* Cabeçalho da nota interna */}
                    {isInternal && (
                      <div className="flex items-center gap-1 text-[10px] font-bold mb-1" style={{ color: '#B45309' }}>
                        <Lock size={10} />
                        <span>Nota privada</span>
                        {msg.sender?.name && <span>• {msg.sender.name}</span>}
                      </div>
                    )}
                    {!isInternal && !isOutgoing && msg.sender?.name && (
                      <div className="text-[11px] font-semibold mb-1" style={{ color: '#8B5CF6' }}>
                        {msg.sender.name}
                      </div>
                    )}
                    {msg.type === 'IMAGE' ? (
                      <img src={mediaSrc} alt="Imagem" className="rounded-lg max-w-full max-h-52 object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(mediaSrc, '_blank')} />
                    ) : msg.type === 'AUDIO' ? (
                      <audio controls src={mediaSrc} className="w-full h-8" />
                    ) : msg.type === 'VIDEO' ? (
                      <video controls src={mediaSrc} className="rounded-lg max-w-full max-h-52" />
                    ) : msg.type === 'DOCUMENT' ? (
                      <a href={mediaSrc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" style={{ color: isOutgoing ? '#E0F2FE' : 'var(--cw-accent)' }}>
                        <Paperclip size={14} />
                        <span className="text-sm">Download Anexo</span>
                      </a>
                    ) : (
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}

                    <div className="text-[10px] mt-1 flex items-center justify-end gap-1"
                      style={{ color: isInternal ? '#B45309' : 'var(--cw-text-tertiary)', opacity: isOutgoing && !isInternal ? 0.8 : 1 }}
                    >
                      {isInternal && <Lock size={10} />}
                      {time}
                      {isOutgoing && !isInternal && <CheckCheck size={12} />}
                    </div>
                  </div>

                  {/* Outgoing: indicator on right */}
                  {isOutgoing && (
                    <div
                      className="w-7 h-7 min-w-[28px] rounded-full flex items-center justify-center text-white text-[10px] font-semibold ml-2 mt-1"
                      style={{ backgroundColor: isInternal ? '#D97706' : 'var(--cw-accent)' }}
                    >
                      {isInternal ? <Lock size={12} /> : 'R'}
                    </div>
                  )}
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Chatwoot style */}
          <div
            className="border-t"
            style={{
              backgroundColor: isPrivateMode ? 'var(--cw-private-bg)' : 'var(--cw-bg-secondary)',
              borderColor: isPrivateMode ? 'var(--cw-private-border)' : 'var(--cw-border)',
            }}
          >
            {/* Reply / Private tabs */}
            <div className="flex items-center justify-between px-4 pt-2">
              <div className="flex items-center gap-0">
                <button
                  onClick={() => setInputMode('reply')}
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-full transition-all ${!isPrivateMode ? 'text-white' : ''}`}
                  style={{
                    backgroundColor: !isPrivateMode ? 'var(--cw-bg-tertiary)' : 'transparent',
                    color: !isPrivateMode ? 'var(--cw-text-primary)' : 'var(--cw-text-tertiary)',
                    border: !isPrivateMode ? '1px solid var(--cw-border-light)' : '1px solid transparent',
                  }}
                >
                  Responder
                </button>
                <button
                  onClick={() => setInputMode('private')}
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-full transition-all ml-1 ${isPrivateMode ? 'text-white' : ''}`}
                  style={{
                    backgroundColor: isPrivateMode ? 'var(--cw-bg-tertiary)' : 'transparent',
                    color: isPrivateMode ? 'var(--cw-text-primary)' : 'var(--cw-text-tertiary)',
                    border: isPrivateMode ? '1px solid var(--cw-private-border)' : '1px solid transparent',
                  }}
                >
                  Mensagem Privada
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded transition-colors" style={{ color: 'var(--cw-accent)' }} title="AI Assist">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                </button>
                <button className="p-1.5 rounded transition-colors" style={{ color: 'var(--cw-text-tertiary)' }} title="Expandir">
                  <Expand size={14} />
                </button>
              </div>
            </div>

            {/* Text Input com @mention dropdown */}
            <form onSubmit={handleSendMessage} className="px-4 pb-2 relative">
              {/* Dropdown de menções */}
              {mentionSearch !== null && mentionResults.length > 0 && (
                <div
                  className="absolute bottom-full left-4 right-4 mb-1 rounded-lg shadow-xl border overflow-hidden z-50"
                  style={{
                    backgroundColor: 'var(--cw-bg-tertiary)',
                    borderColor: 'var(--cw-border)',
                  }}
                >
                  {mentionResults.map((agent, idx) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => insertMention(agent)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] transition-colors"
                      style={{
                        backgroundColor: idx === mentionHighlight ? 'var(--cw-bg-active)' : 'transparent',
                        color: 'var(--cw-text-primary)',
                      }}
                      onMouseEnter={() => setMentionHighlight(idx)}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                        style={{ backgroundColor: 'var(--cw-accent)' }}
                      >
                        {agent.name.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <span className="font-medium">{agent.name}</span>
                        <span className="ml-2 text-[11px]" style={{ color: 'var(--cw-text-tertiary)' }}>{agent.email}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={messageInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isPrivateMode ? 'Nota privada — visível apenas para agentes. Use @nome para mencionar.' : 'Shift + enter para nova linha. Use @ para mencionar agentes.'}
                className="w-full bg-transparent border-none outline-none resize-none text-[13px] leading-relaxed py-2 min-h-[60px] max-h-[120px]"
                style={{
                  color: 'var(--cw-text-primary)',
                }}
                rows={2}
              />

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--cw-text-tertiary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cw-text-primary)'; e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cw-text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                    title="Emoji"
                  >
                    <Smile size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info('Anexo de arquivos em breve')}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--cw-text-tertiary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cw-text-primary)'; e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cw-text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                    title="Anexar"
                  >
                    <Paperclip size={18} />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--cw-text-tertiary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cw-text-primary)'; e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cw-text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                    title="Áudio"
                  >
                    <Mic size={18} />
                  </button>
                  <button
                    type="button"
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--cw-text-tertiary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cw-text-primary)'; e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cw-text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                    title="Código"
                  >
                    <Code2 size={18} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isPrivateMode ? '#B8860B' : 'var(--cw-accent)',
                  }}
                  onMouseEnter={(e) => {
                    if (messageInput.trim()) {
                      e.currentTarget.style.backgroundColor = isPrivateMode ? '#A0750A' : 'var(--cw-accent-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isPrivateMode ? '#B8860B' : 'var(--cw-accent)';
                  }}
                >
                  Enviar
                  <span className="text-[10px] opacity-70">(CTRL + ↵)</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Contact Info Panel (Chatwoot right panel) */}
        {showContactPanel && (
          <div
            className="w-[280px] min-w-[280px] border-l overflow-y-auto"
            style={{
              backgroundColor: 'var(--cw-bg-secondary)',
              borderColor: 'var(--cw-border)',
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'var(--cw-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[13px] font-semibold" style={{ color: 'var(--cw-text-primary)' }}>
                  Informações do Contato
                </h4>
                <button
                  onClick={() => setShowContactPanel(false)}
                  className="p-1 rounded transition-colors"
                  style={{ color: 'var(--cw-text-tertiary)' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Contact avatar & name */}
              <div className="flex flex-col items-center text-center mb-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold mb-2"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                >
                  {(ticket.customerName || ticket.client || 'CL').substring(0, 2).toUpperCase()}
                </div>
                <h5 className="text-[14px] font-semibold" style={{ color: 'var(--cw-text-primary)' }}>
                  {ticket.customerName || ticket.client || 'Cliente'}
                </h5>
              </div>
            </div>

            {/* Info fields */}
            <div className="p-4 space-y-3">
              <InfoField icon={User} label="Setor" value={ticket.sector || 'Não informado'} />
              <InfoField icon={Briefcase} label="Categoria" value={ticket.category || 'Geral'} />
              {ticket.location && (
                <InfoField icon={MapPin} label="Local" value={ticket.location} />
              )}

              {/* Description */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--cw-border)' }}>
                <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--cw-text-tertiary)' }}>Descrição</p>
                <p className="text-[12px]" style={{ color: 'var(--cw-text-secondary)' }}>
                  {ticket.description || 'Sem descrição.'}
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--cw-bg-tertiary)',
                    color: 'var(--cw-text-secondary)',
                    border: '1px solid var(--cw-border)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--cw-bg-tertiary)' }}
                >
                  <UserPlus size={14} />
                  Transferir Chamado
                </button>
              </div>
            </div>
          </div>
        )}
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
            onClose();
          } catch (err) {
            toast.error('Erro ao transferir chamado');
          }
        }}
        currentTechnicianId={ticket.technician}
        ticketTitle={ticket.title}
      />
    </div>
  );
}

// Helper component for contact info fields
function InfoField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="mt-0.5" style={{ color: 'var(--cw-text-tertiary)' }} />
      <div>
        <p className="text-[11px] font-medium" style={{ color: 'var(--cw-text-tertiary)' }}>{label}</p>
        <p className="text-[12px]" style={{ color: 'var(--cw-text-primary)' }}>{value}</p>
      </div>
    </div>
  );
}
