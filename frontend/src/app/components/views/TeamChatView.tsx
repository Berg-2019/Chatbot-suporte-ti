import { Send, Users, Paperclip, Smile } from 'lucide-react';
import { useState } from 'react';

interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  time: string;
  isOwn: boolean;
}

export default function TeamChatView() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: 'Robison TI',
      message: 'Pessoal, tem alguém disponível para atender o ticket #8545?',
      time: '10:30',
      isOwn: false
    },
    {
      id: 2,
      sender: 'Carlos Oliveira',
      message: 'Eu posso atender, estou livre agora',
      time: '10:32',
      isOwn: false
    },
    {
      id: 3,
      sender: 'Matheus Soares',
      message: 'Ótimo! Obrigado Carlos 👍',
      time: '10:33',
      isOwn: true
    },
    {
      id: 4,
      sender: 'Robison TI',
      message: 'Alguém viu o relatório de ontem? Preciso conferir uns dados',
      time: '10:45',
      isOwn: false
    },
    {
      id: 5,
      sender: 'Matheus Soares',
      message: 'Sim, está na aba de Relatórios. Vou te enviar o link',
      time: '10:46',
      isOwn: true
    },
  ]);

  const teamMembers = [
    { name: 'Matheus Soares', status: 'online', role: 'Admin' },
    { name: 'Robison TI', status: 'online', role: 'Técnico' },
    { name: 'Carlos Oliveira', status: 'busy', role: 'Técnico' },
    { name: 'Ana Paula Santos', status: 'offline', role: 'Suporte' },
  ];

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: messages.length + 1,
      sender: 'Matheus Soares',
      message: message,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true
    };

    setMessages([...messages, newMessage]);
    setMessage('');
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
              <p className="text-slate-400 text-sm">4 membros online</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${msg.isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                {!msg.isOwn && (
                  <div className="text-xs text-slate-400 mb-1 px-1">{msg.sender}</div>
                )}
                <div
                  className={`rounded-lg px-4 py-3 ${
                    msg.isOwn
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-white rounded-tl-none'
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <span className="text-xs opacity-70 mt-1 block text-right">
                    {msg.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
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
