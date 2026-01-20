import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { teamChatApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface TeamMessage {
  id: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
}

export function TeamChat() {
  const { user } = useAuth();
  const { socket, on, isConnected } = useSocket();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll sempre para baixo quando novas mensagens chegarem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Carregar histórico
  useEffect(() => {
    if (user) {
      loadMessages();
    }
  }, [user]);

  async function loadMessages() {
    try {
      const response = await teamChatApi.list();
      setMessages(response.data);
    } catch (error) {
      console.error('Erro ao carregar chat:', error);
      toast.error('Erro ao carregar histórico do chat');
    } finally {
      setLoading(false);
    }
  }

  // Socket Listener
  useEffect(() => {
    // Entrar na sala
    if (isConnected && socket) {
      socket.emit('team:join');
    }

    // Ouvir mensagens
    const cleanup = on('team:message', (message: TeamMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    return cleanup;
  }, [on, isConnected, socket]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    // Enviar via Socket
    socket.emit('team:message', {
      content: newMessage,
      senderId: user?.id,
    });

    setNewMessage('');
  };

  if (loading) {
    return <div className="p-4 text-center">Carregando chat...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-lg">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          👥 Chat da Equipe
        </h2>
        <span className="text-xs text-gray-500">
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 shadow-sm ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                }`}
              >
                {!isMe && (
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                    {msg.sender.name}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
