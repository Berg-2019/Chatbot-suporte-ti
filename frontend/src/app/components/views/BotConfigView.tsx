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
  XCircle,
  QrCode,
  Smartphone,
  LogOut,
  RefreshCw,
  Wifi,
  WifiOff,
  Loader2,
  Phone,
  Copy,
  Check
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { botApi, type BotStatus, type QRCodeResponse, type PairingCodeResponse } from '@/app/services/api';

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

  // Real status state
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  // QR Code state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoadingQR, setIsLoadingQR] = useState(false);

  // Pairing Code state
  const [showPairingInput, setShowPairingInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiry, setPairingExpiry] = useState<number | null>(null);
  const [isLoadingPairing, setIsLoadingPairing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Action loading states
  const [isRestarting, setIsRestarting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch bot status
  const fetchStatus = useCallback(async () => {
    try {
      const status = await botApi.getStatus();
      setBotStatus(status);
      setStatusError(null);

      // If disconnected or qr_ready, fetch QR
      if (status.status === 'disconnected' || status.status === 'qr_ready') {
        fetchQRCode();
      } else {
        setQrCode(null);
        setPairingCode(null);
      }
    } catch (err: any) {
      setStatusError(err.message || 'Falha ao conectar com o bot');
      setBotStatus({ status: 'disconnected' });
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // Fetch QR Code
  const fetchQRCode = async () => {
    setIsLoadingQR(true);
    try {
      const response = await botApi.getQR();
      if (response.qrCode) {
        setQrCode(response.qrCode);
      }
    } catch (err: any) {
      console.error('Failed to fetch QR:', err);
    } finally {
      setIsLoadingQR(false);
    }
  };

  // Request pairing code
  const requestPairingCode = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Digite o número do telefone');
      return;
    }

    setIsLoadingPairing(true);
    try {
      const response = await botApi.getPairingCode(phoneNumber);
      if (response.pairingCode) {
        setPairingCode(response.pairingCode);
        setPairingExpiry(response.expiresIn || 60);
        toast.success('Código de pareamento gerado!');
      } else {
        toast.error(response.message || 'Falha ao gerar código');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha ao gerar código de pareamento');
    } finally {
      setIsLoadingPairing(false);
    }
  };

  // Copy pairing code
  const copyPairingCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopiedCode(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Handle restart
  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      await botApi.restart();
      toast.success('Bot reiniciando...');
      // Wait and refresh status
      setTimeout(fetchStatus, 3000);
    } catch (err: any) {
      toast.error(err.message || 'Falha ao reiniciar');
    } finally {
      setIsRestarting(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await botApi.disconnect();
      toast.success('Bot desconectado');
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao desconectar');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await botApi.logout();
      toast.success('Sessão encerrada. Escaneie o QR code novamente.');
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao encerrar sessão');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Polling for status
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Pairing code expiry countdown
  useEffect(() => {
    if (pairingExpiry && pairingExpiry > 0) {
      const timer = setInterval(() => {
        setPairingExpiry(prev => {
          if (prev && prev > 1) return prev - 1;
          setPairingCode(null);
          return null;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [pairingExpiry]);

  const handleTestBot = () => {
    if (!testMessage.trim()) return;

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

  // Format uptime
  const formatUptime = (seconds?: number) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Get status display
  const getStatusDisplay = () => {
    if (isLoadingStatus) return { text: 'Carregando...', color: 'yellow', icon: Loader2 };
    if (statusError) return { text: 'Erro', color: 'red', icon: XCircle };

    switch (botStatus?.status) {
      case 'connected':
        return { text: 'Conectado', color: 'green', icon: Wifi };
      case 'connecting':
        return { text: 'Conectando...', color: 'yellow', icon: Loader2 };
      case 'qr_ready':
        return { text: 'Aguardando QR', color: 'blue', icon: QrCode };
      case 'maintenance':
        return { text: 'Manutenção', color: 'yellow', icon: RefreshCw };
      default:
        return { text: 'Desconectado', color: 'red', icon: WifiOff };
    }
  };

  const statusDisplay = getStatusDisplay();
  const isConnected = botStatus?.status === 'connected';
  const needsConnection = botStatus?.status === 'disconnected' || botStatus?.status === 'qr_ready';

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

        {/* Right Column: Status, Connection & Test */}
        <div className="space-y-6">
          {/* Bot Status Card */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Activity className="text-blue-500" size={24} />
                <h2 className="text-xl font-semibold text-white">Status do Bot</h2>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
                statusDisplay.color === 'green' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                statusDisplay.color === 'red' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                statusDisplay.color === 'blue' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
              }`}>
                <statusDisplay.icon size={14} className={statusDisplay.color === 'yellow' ? 'animate-spin' : ''} />
                {statusDisplay.text}
              </div>
            </div>

            {/* Stats when connected */}
            {isConnected && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Tempo Online</span>
                    <span className="text-2xl font-bold text-white font-mono">{formatUptime(botStatus?.uptime)}</span>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Número</span>
                    <span className="text-lg font-bold text-white font-mono">{botStatus?.connectedNumber || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Msg Recebidas</span>
                    <span className="text-2xl font-bold text-green-400 font-mono">{botStatus?.messagesReceived || 0}</span>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">Msg Enviadas</span>
                    <span className="text-2xl font-bold text-blue-400 font-mono">{botStatus?.messagesSent || 0}</span>
                  </div>
                </div>
              </>
            )}

            {/* Control Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleRestart}
                disabled={isRestarting}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-lg flex flex-col items-center gap-2 border border-slate-700 transition-all hover:border-slate-500 disabled:opacity-50"
              >
                <RotateCcw size={20} className={isRestarting ? 'animate-spin' : ''} />
                <span className="text-xs font-medium">Reiniciar</span>
              </button>

              <button
                onClick={handleDisconnect}
                disabled={!isConnected || isDisconnecting}
                className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-all ${
                  !isConnected
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                    : 'bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-600/30'
                }`}
              >
                <Square size={20} />
                <span className="text-xs font-medium">Desconectar</span>
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="bg-orange-600/20 text-orange-500 hover:bg-orange-600/30 border border-orange-600/30 p-3 rounded-lg flex flex-col items-center gap-2 transition-all disabled:opacity-50"
              >
                <LogOut size={20} className={isLoggingOut ? 'animate-pulse' : ''} />
                <span className="text-xs font-medium">Logout</span>
              </button>
            </div>

            {/* Status Error */}
            {statusError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                <AlertTriangle className="text-red-500 shrink-0" size={18} />
                <p className="text-xs text-red-200">{statusError}</p>
              </div>
            )}
          </div>

          {/* WhatsApp Connection Card - Show when not connected */}
          {needsConnection && (
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Smartphone className="text-green-500" size={24} />
                <h2 className="text-xl font-semibold text-white">Conectar WhatsApp</h2>
              </div>

              {/* Connection Methods Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => { setShowPairingInput(false); fetchQRCode(); }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    !showPairingInput
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode size={18} />
                  QR Code
                </button>
                <button
                  onClick={() => setShowPairingInput(true)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    showPairingInput
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Phone size={18} />
                  Código
                </button>
              </div>

              {/* QR Code Section */}
              {!showPairingInput && (
                <div className="flex flex-col items-center">
                  {isLoadingQR ? (
                    <div className="w-64 h-64 bg-slate-800 rounded-xl flex items-center justify-center">
                      <Loader2 size={48} className="text-green-500 animate-spin" />
                    </div>
                  ) : qrCode ? (
                    <div className="bg-white p-4 rounded-xl">
                      <img
                        src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                        alt="QR Code WhatsApp"
                        className="w-56 h-56"
                      />
                    </div>
                  ) : (
                    <div className="w-64 h-64 bg-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500">
                      <QrCode size={48} className="mb-2 opacity-50" />
                      <p className="text-sm">QR Code não disponível</p>
                      <button
                        onClick={fetchQRCode}
                        className="mt-4 text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                      >
                        <RefreshCw size={14} />
                        Tentar novamente
                      </button>
                    </div>
                  )}
                  <p className="text-slate-400 text-sm mt-4 text-center">
                    Abra o WhatsApp no celular e escaneie o código QR
                  </p>
                </div>
              )}

              {/* Pairing Code Section */}
              {showPairingInput && (
                <div className="space-y-4">
                  {!pairingCode ? (
                    <>
                      <div>
                        <label className="text-slate-400 text-sm mb-2 block">
                          Número do WhatsApp (com DDD)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="5511999999999"
                            className="flex-1 bg-slate-800 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <button
                            onClick={requestPairingCode}
                            disabled={isLoadingPairing || !phoneNumber.trim()}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 rounded-lg transition-colors flex items-center gap-2"
                          >
                            {isLoadingPairing ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <>
                                <Send size={18} />
                                Gerar
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-500 text-xs">
                        Digite o número completo com código do país (55) e DDD
                      </p>
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-slate-400 text-sm mb-4">
                        Digite este código no WhatsApp:
                      </p>
                      <div className="bg-slate-800 rounded-xl p-6 mb-4">
                        <div className="flex items-center justify-center gap-4">
                          <span className="text-4xl font-mono font-bold text-green-400 tracking-widest">
                            {pairingCode}
                          </span>
                          <button
                            onClick={copyPairingCode}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                            title="Copiar código"
                          >
                            {copiedCode ? (
                              <Check size={20} className="text-green-400" />
                            ) : (
                              <Copy size={20} className="text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                      {pairingExpiry && (
                        <p className="text-yellow-500 text-sm">
                          Expira em {pairingExpiry}s
                        </p>
                      )}
                      <button
                        onClick={() => { setPairingCode(null); setPairingExpiry(null); }}
                        className="mt-4 text-slate-400 hover:text-white text-sm"
                      >
                        Gerar novo código
                      </button>
                    </div>
                  )}

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-xs text-blue-200">
                      <strong>Como usar:</strong> No WhatsApp, vá em Configurações → Aparelhos conectados → Conectar com número de telefone
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Bot Interface */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Testar Respostas</h2>

            <div className="bg-slate-800 rounded-lg p-4 min-h-[300px] mb-4 flex flex-col custom-scrollbar overflow-y-auto max-h-[400px]">
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
                className="flex-1 bg-slate-800 text-white rounded-lg pl-4 pr-12 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite uma mensagem de teste..."
              />
              <button
                onClick={handleTestBot}
                className="absolute right-2 top-1.5 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-md transition-colors"
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
