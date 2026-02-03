import { Send, Users, Paperclip, Smile } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { teamChatApi, type TeamMessage } from '@/app/services/api';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

export default function TeamChatView() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null); // Ideally get from context/auth
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user ID (hacky, ideally use AuthContext)
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload);
      } catch (e) {
        console.error("Invalid token", e);
      }
    }
  }, []);

  // Fetch initial messages and connect socket
  useEffect(() => {
    loadMessages();
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Auto scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await teamChatApi.getMessages();
      setMessages(data);
    } catch (error) {
      console.error("Error loading messages", error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const connectSocket = () => {
    const token = localStorage.getItem('authToken');
    // Ensure we use the correct Backend URL from environment or default
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    socketRef.current = io(`${SOCKET_URL}/team-chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to Team Chat');
    });

    socketRef.current.on('newMessage', (newMessage: TeamMessage) => {
      setMessages((prev) => {
        // Avoid duplicates if we handled optimistic update (though we aren't here for simplicity)
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });

    socketRef.current.on('error', (err: any) => {
      console.error('Socket error:', err);
    });
  };

  const teamMembers = [
    { name: 'Matheus Soares', status: 'online', role: 'Admin' },
    { name: 'Robison TI', status: 'online', role: 'Técnico' },
    { name: 'Carlos Oliveira', status: 'busy', role: 'Técnico' },
    { name: 'Ana Paula Santos', status: 'offline', role: 'Suporte' },
  ];

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      await teamChatApi.sendMessage(message);
      setMessage('');
      // No need to manually add to state, socket 'newMessage' event will do it
      // Or we can add optimistically if latency is high, but socket is fast enough usually.
    } catch (error) {
      console.error("Error sending message", error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-slate-600';
      default: return 'bg-slate-600';
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Chat Area */}
      <div className="flex-1 bg-slate-900/50 border border-slate-800/50 rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Chat da Equipe</h2>
              <p className="text-slate-400 text-sm">Online</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center text-slate-500">Carregando...</div>
          ) : (
            messages.map((msg) => {
              const isOwn = currentUser && msg.senderId === currentUser.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && (
                      <div className="text-xs text-slate-400 mb-1 px-1">{msg.sender.name}</div>
                    )}
                    <div
                      className={`rounded-lg px-4 py-3 ${isOwn
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-800 text-white rounded-tl-none'
                        }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <span className="text-xs opacity-70 mt-1 block text-right">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-slate-800/50">
          <div className="flex items-end gap-2">
            <button className="p-3 hover:bg-slate-800 rounded-lg transition-colors">
              <Paperclip className="text-slate-400" size={20} />
            </button>
            <button className="p-3 hover:bg-slate-800 rounded-lg transition-colors">
              <Smile className="text-slate-400" size={20} />
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-slate-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Team Members Sidebar */}
      <div className="w-80 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 hidden lg:block">
        <h3 className="text-lg font-semibold text-white mb-6">Membros da Equipe</h3>

        <div className="space-y-3">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {member.name.charAt(0)}
                </div>
                <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-slate-900`}></div>
              </div>

              <div className="flex-1">
                <div className="text-white font-medium text-sm">{member.name}</div>
                <div className="text-slate-400 text-xs">{member.role}</div>
              </div>

              <div className="text-xs text-slate-500 capitalize">
                {member.status === 'online' && '🟢'}
                {member.status === 'busy' && '🟡'}
                {member.status === 'offline' && '⚫'}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800/50">
          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg text-sm font-medium transition-colors">
            + Convidar Membro
          </button>
        </div>
      </div>
    </div>
  );
}
