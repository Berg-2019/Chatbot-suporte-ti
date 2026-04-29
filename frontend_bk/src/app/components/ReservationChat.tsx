import { X, Send, Paperclip, User, Bot, Check, Clock } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'me' | 'system';
  timestamp: string;
}

interface ReservationChatProps {
  isOpen: boolean;
  onClose: () => void;
  requesterName: string;
  assetName: string;
  reservationId: number;
}

export default function ReservationChat({ 
  isOpen, 
  onClose, 
  requesterName, 
  assetName,
  reservationId 
}: ReservationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Simula carga inicial de mensagens
  useEffect(() => {
    if (isOpen) {
      setMessages([
        { id: 1, text: `Olá! Gostaria de reservar o ${assetName}.`, sender: 'user', timestamp: '14:00' },
        { id: 2, text: 'O sistema registrou sua solicitação automaticamente.', sender: 'system', timestamp: '14:00' },
      ]);
    }
  }, [isOpen, assetName, reservationId]);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const myMsg: Message = {
      id: Date.now(),
      text: newMessage,
      sender: 'me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, myMsg]);
    setNewMessage('');

    // Simula resposta automática
    setTimeout(() => {
      const replyMsg: Message = {
        id: Date.now() + 1,
        text: 'Obrigado pelo retorno. Fico no aguardo da confirmação.',
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, replyMsg]);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          />
          
          {/* Chat Panel */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    {requesterName.charAt(0)}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-white font-semibold">{requesterName}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={12} /> Solicitado às 14:00
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Context Info */}
            <div className="bg-blue-900/20 px-4 py-2 border-b border-blue-900/30 flex items-center gap-2">
              <span className="text-xs text-blue-300 font-medium">Assunto:</span>
              <span className="text-xs text-slate-300 truncate">{assetName}</span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50 custom-scrollbar">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    max-w-[80%] rounded-2xl px-4 py-3 relative
                    ${msg.sender === 'me' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : msg.sender === 'system'
                        ? 'bg-slate-800/50 text-slate-400 text-xs w-full text-center border border-slate-700'
                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}
                  `}>
                    {msg.sender !== 'system' && <p className="text-sm">{msg.text}</p>}
                    {msg.sender === 'system' && <p>{msg.text}</p>}
                    
                    {msg.sender !== 'system' && (
                      <div className={`text-[10px] mt-1 flex items-center gap-1 opacity-70 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        {msg.timestamp}
                        {msg.sender === 'me' && <Check size={10} />}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-800/50 border-t border-slate-700">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                <button className="p-2 text-slate-400 hover:text-white transition-colors">
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 text-sm"
                  autoFocus
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
