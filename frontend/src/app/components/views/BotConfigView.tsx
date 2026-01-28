import { 
  Bot, 
  MessageSquare, 
  Clock, 
  Settings, 
  Save, 
  Send,
  Activity,
  Play,
  Square,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useState } from 'react';

export default function BotConfigView() {
  const [botConfig, setBotConfig] = useState({
    welcomeMessage: 'Olá! Bem-vindo ao suporte técnico. Como posso ajudá-lo hoje?',
    autoResponseTime: '30',
    workingHours: true,
    outOfHoursMessage: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.',
    categoryKeywords: {
      hardware: 'mouse, teclado, monitor, computador',
      software: 'programa, aplicativo, sistema, erro',
      network: 'internet, wifi, rede, conexão',
    }
  });

  const [testMessage, setTestMessage] = useState('');
  const [botResponse, setBotResponse] = useState('');
  
  // Status State
  const [botStatus, setBotStatus] = useState<'online' | 'offline' | 'maintenance'>('online');
  const [uptime, setUptime] = useState('24h 13m');

  const handleTestBot = () => {
    if (!testMessage.trim()) return;
    
    // Simula resposta do bot
    const message = testMessage.toLowerCase();
    let response = '';

    if (message.includes('olá') || message.includes('oi')) {
      response = botConfig.welcomeMessage;
    } else if (Object.values(botConfig.categoryKeywords.hardware).some(keyword => message.includes(keyword))) {
      response = 'Identifiquei que seu problema é relacionado a Hardware. Vou criar um ticket para você.';
    } else if (Object.values(botConfig.categoryKeywords.software).some(keyword => message.includes(keyword))) {
      response = 'Identifiquei que seu problema é relacionado a Software. Vou criar um ticket para você.';
    } else if (Object.values(botConfig.categoryKeywords.network).some(keyword => message.includes(keyword))) {
      response = 'Identifiquei que seu problema é relacionado a Rede/Infraestrutura. Vou criar um ticket para você.';
    } else {
      response = 'Por favor, descreva seu problema com mais detalhes para que eu possa ajudá-lo melhor.';
    }

    setBotResponse(response);
  };

  const handleRestart = () => {
    const previousStatus = botStatus;
    setBotStatus('maintenance');
    setUptime('0m');
    setTimeout(() => {
      setBotStatus('online');
      setUptime('0m 01s');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Configurar Bot WhatsApp</h1>
        <p className="text-slate-400">Configure respostas automáticas e comportamento do bot</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Configuration */}
        <div className="space-y-6">
          {/* Mensagem de Boas-vindas */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="text-blue-500" size={24} />
              <h2 className="text-xl font-semibold text-white">Mensagem de Boas-vindas</h2>
            </div>
            <textarea
              value={botConfig.welcomeMessage}
              onChange={(e) => setBotConfig({ ...botConfig, welcomeMessage: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-lg p-4 outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
              placeholder="Digite a mensagem de boas-vindas..."
            />
          </div>

          {/* Tempo de Resposta */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="text-purple-500" size={24} />
              <h2 className="text-xl font-semibold text-white">Tempo de Resposta</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-2 block">
                  Tempo de espera antes da resposta automática (segundos)
                </label>
                <input
                  type="number"
                  value={botConfig.autoResponseTime}
                  onChange={(e) => setBotConfig({ ...botConfig, autoResponseTime: e.target.value })}
                  className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          {/* Horário de Funcionamento */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="text-green-500" size={24} />
              <h2 className="text-xl font-semibold text-white">Horário de Funcionamento</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Ativar horário comercial</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={botConfig.workingHours}
                    onChange={(e) => setBotConfig({ ...botConfig, workingHours: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <textarea
                value={botConfig.outOfHoursMessage}
                onChange={(e) => setBotConfig({ ...botConfig, outOfHoursMessage: e.target.value })}
                className="w-full bg-slate-800 text-white rounded-lg p-4 outline-none focus:ring-2 focus:ring-green-500 min-h-[80px] resize-none"
                placeholder="Mensagem fora do horário..."
              />
            </div>
          </div>

          {/* Palavras-chave por Categoria */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bot className="text-orange-500" size={24} />
              <h2 className="text-xl font-semibold text-white">Palavras-chave</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Hardware</label>
                <input
                  type="text"
                  value={botConfig.categoryKeywords.hardware}
                  onChange={(e) => setBotConfig({ 
                    ...botConfig, 
                    categoryKeywords: { ...botConfig.categoryKeywords, hardware: e.target.value }
                  })}
                  className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="mouse, teclado, monitor..."
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Software</label>
                <input
                  type="text"
                  value={botConfig.categoryKeywords.software}
                  onChange={(e) => setBotConfig({ 
                    ...botConfig, 
                    categoryKeywords: { ...botConfig.categoryKeywords, software: e.target.value }
                  })}
                  className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="programa, aplicativo, sistema..."
                />
              </div>
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Rede/Infraestrutura</label>
                <input
                  type="text"
                  value={botConfig.categoryKeywords.network}
                  onChange={(e) => setBotConfig({ 
                    ...botConfig, 
                    categoryKeywords: { ...botConfig.categoryKeywords, network: e.target.value }
                  })}
                  className="w-full bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="internet, wifi, rede..."
                />
              </div>
            </div>
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
            <Save size={20} />
            Salvar Configurações
          </button>
        </div>

        {/* Right Column: Status & Test */}
        <div className="space-y-6">
          {/* Bot Status Card */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <Activity className="text-blue-500" size={24} />
                   <h2 className="text-xl font-semibold text-white">Status do Bot</h2>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
                    botStatus === 'online' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                    botStatus === 'offline' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${
                        botStatus === 'online' ? 'bg-green-500' :
                        botStatus === 'offline' ? 'bg-red-500' :
                        'bg-yellow-500 animate-pulse'
                    }`} />
                    {botStatus === 'online' ? 'Online' : botStatus === 'offline' ? 'Offline' : 'Reiniciando...'}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Tempo Online</span>
                    <span className="text-2xl font-bold text-white font-mono">{uptime}</span>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Mensagens Hoje</span>
                    <span className="text-2xl font-bold text-white font-mono">1,234</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <button 
                    onClick={() => {
                        setBotStatus('online');
                        setUptime('0m 01s');
                    }}
                    disabled={botStatus === 'online' || botStatus === 'maintenance'}
                    className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-all ${
                        botStatus === 'online' 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' 
                        : 'bg-green-600/20 text-green-500 hover:bg-green-600/30 border border-green-600/30'
                    }`}
                >
                    <Play size={20} />
                    <span className="text-xs font-medium">Iniciar</span>
                </button>
                
                <button 
                    onClick={() => {
                        setBotStatus('offline');
                        setUptime('-');
                    }}
                    disabled={botStatus === 'offline' || botStatus === 'maintenance'}
                    className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-all ${
                        botStatus === 'offline'
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                        : 'bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-600/30'
                    }`}
                >
                    <Square size={20} />
                    <span className="text-xs font-medium">Parar</span>
                </button>

                <button 
                    onClick={handleRestart}
                    disabled={botStatus === 'maintenance'}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-lg flex flex-col items-center gap-2 border border-slate-700 transition-all hover:border-slate-500"
                >
                    <RotateCcw size={20} className={botStatus === 'maintenance' ? 'animate-spin' : ''} />
                    <span className="text-xs font-medium">Reiniciar</span>
                </button>
            </div>
            
            {/* Status alerts based on state */}
            {botStatus === 'offline' && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="text-red-500 shrink-0" size={18} />
                    <p className="text-xs text-red-200">O bot está desligado. Nenhuma mensagem automática será enviada.</p>
                </div>
            )}
            
            {botStatus === 'maintenance' && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3">
                    <Activity className="text-yellow-500 shrink-0 animate-pulse" size={18} />
                    <p className="text-xs text-yellow-200">Reiniciando serviços do bot, aguarde...</p>
                </div>
            )}
          </div>

          {/* Test Bot Interface */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Testar Respostas</h2>
            
            <div className="bg-slate-800 rounded-lg p-4 min-h-[400px] mb-4 flex flex-col custom-scrollbar overflow-y-auto max-h-[500px]">
              {botResponse ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[80%]">
                      <div className="text-xs text-slate-400 mb-1 text-right">Você</div>
                      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-lg">
                        {testMessage}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[80%]">
                      <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                        Bot <Bot size={12} />
                      </div>
                      <div className="bg-slate-700 text-white rounded-2xl rounded-tl-none px-4 py-3 shadow-lg">
                        {botResponse}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                    <Bot size={48} className="mb-2" />
                    <p>Inicie uma conversa para testar</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 relative">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTestBot()}
                disabled={botStatus === 'offline' || botStatus === 'maintenance'}
                className="flex-1 bg-slate-800 text-white rounded-lg pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder={botStatus === 'online' ? "Digite uma mensagem de teste..." : "Bot offline"}
              />
              <button
                onClick={handleTestBot}
                disabled={botStatus === 'offline' || botStatus === 'maintenance'}
                className="absolute right-2 top-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white p-1.5 rounded-md transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
