/**
 * Configurar Bot Page - Conexão WhatsApp + Configurações
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { botApi } from '@/lib/api';
import QRCode from 'qrcode';

interface BotStatus {
    connected: boolean;
    phoneNumber: string | null;
    uptime: number;
    connectionState: string;
    hasQR: boolean;
}

interface BotConfig {
    greeting: string;
    menuMessage: string;
    categoryPrompt: string;
    confirmationMessage: string;
    closingMessage: string;
    unavailableMessage: string;
    workingHoursStart: string;
    workingHoursEnd: string;
    workingDays: string[];
    autoReplyDelay: number;
}

const defaultConfig: BotConfig = {
    greeting: 'Olá! 👋 Bem-vindo ao Suporte Técnico. Como posso ajudá-lo hoje?',
    menuMessage: 'Por favor, escolha uma opção:\n1️⃣ Abrir chamado\n2️⃣ Consultar chamado\n3️⃣ Falar com atendente',
    categoryPrompt: 'Qual a categoria do seu problema?\n1️⃣ Hardware\n2️⃣ Software\n3️⃣ Rede\n4️⃣ Outros',
    confirmationMessage: 'Seu chamado foi aberto com sucesso! Número: {ticket_id}\nEm breve um técnico irá atendê-lo.',
    closingMessage: 'Obrigado pelo contato! 😊 Se precisar de algo mais, é só chamar.',
    unavailableMessage: 'Nosso horário de atendimento é de {start} às {end}. Deixe sua mensagem que retornaremos assim que possível.',
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00',
    workingDays: ['seg', 'ter', 'qua', 'qui', 'sex'],
    autoReplyDelay: 2,
};

const weekDays = [
    { id: 'seg', label: 'Seg' },
    { id: 'ter', label: 'Ter' },
    { id: 'qua', label: 'Qua' },
    { id: 'qui', label: 'Qui' },
    { id: 'sex', label: 'Sex' },
    { id: 'sab', label: 'Sáb' },
    { id: 'dom', label: 'Dom' },
];

export default function BotConfigPage() {
    // Conexão WhatsApp
    const [status, setStatus] = useState<BotStatus | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [connectionTab, setConnectionTab] = useState<'qr' | 'code'>('qr');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Configurações
    const [config, setConfig] = useState<BotConfig>(defaultConfig);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Buscar status e QR
    const fetchStatus = useCallback(async () => {
        try {
            const [statusRes, qrRes] = await Promise.all([
                botApi.status(),
                botApi.qr(),
            ]);
            setStatus(statusRes.data);

            if (qrRes.data.available && qrRes.data.qr) {
                const dataUrl = await QRCode.toDataURL(qrRes.data.qr, {
                    width: 256,
                    margin: 2,
                    color: { dark: '#000000', light: '#ffffff' },
                });
                setQrDataUrl(dataUrl);
            } else {
                setQrDataUrl(null);
            }
            setError(null);
        } catch (err: any) {
            setError('Bot não disponível');
            setStatus(null);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    useEffect(() => {
        const savedConfig = localStorage.getItem('botConfig');
        if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
        }
    }, []);

    // Gerar código de pareamento
    async function handleRequestPairingCode() {
        if (!phoneNumber) {
            setError('Digite o número do telefone');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await botApi.pairingCode(phoneNumber);
            if (res.data.success && res.data.code) {
                setPairingCode(res.data.code);
            } else {
                setError(res.data.error || 'Erro ao gerar código');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao gerar código');
        } finally {
            setLoading(false);
        }
    }

    // Desconectar
    async function handleDisconnect() {
        setLoading(true);
        try {
            await botApi.disconnect();
            setTimeout(fetchStatus, 1000);
        } catch (err) {
            setError('Erro ao desconectar');
        } finally {
            setLoading(false);
        }
    }

    // Logout (limpar sessão)
    async function handleLogout() {
        if (!confirm('Isso vai remover a sessão. Você precisará escanear o QR novamente. Continuar?')) return;
        setLoading(true);
        try {
            await botApi.logout();
            setPairingCode(null);
            setTimeout(fetchStatus, 1000);
        } catch (err) {
            setError('Erro ao fazer logout');
        } finally {
            setLoading(false);
        }
    }

    // Reiniciar
    async function handleRestart() {
        setLoading(true);
        try {
            await botApi.restart();
            setTimeout(fetchStatus, 2000);
        } catch (err) {
            setError('Erro ao reiniciar');
        } finally {
            setLoading(false);
        }
    }

    // Config handlers
    function handleChange(field: keyof BotConfig, value: any) {
        setConfig(prev => ({ ...prev, [field]: value }));
        setSaved(false);
    }

    function toggleDay(day: string) {
        const newDays = config.workingDays.includes(day)
            ? config.workingDays.filter(d => d !== day)
            : [...config.workingDays, day];
        handleChange('workingDays', newDays);
    }

    async function handleSave() {
        setSaving(true);
        localStorage.setItem('botConfig', JSON.stringify(config));
        await new Promise(r => setTimeout(r, 500));
        setSaving(false);
        setSaved(true);
    }

    const formatUptime = (ms: number) => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🤖 Configurar Bot</h1>
                <p className="text-gray-600 dark:text-gray-400">Conexão WhatsApp e configurações do bot</p>
            </div>

            {/* Conexão WhatsApp */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📱 Conexão WhatsApp</h2>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* Status */}
                <div className="flex items-center gap-4 mb-6">
                    <div className={`w-3 h-3 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-gray-900 dark:text-white font-medium">
                        {status?.connected ? `Conectado: ${status.phoneNumber}` : 'Desconectado'}
                    </span>
                    {status?.connected && (
                        <span className="text-gray-500 text-sm">Uptime: {formatUptime(status.uptime)}</span>
                    )}
                </div>

                {/* Conexão */}
                {!status?.connected && (
                    <>
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                            <button
                                onClick={() => setConnectionTab('qr')}
                                className={`px-4 py-2 font-medium ${connectionTab === 'qr' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                            >
                                📷 QR Code
                            </button>
                            <button
                                onClick={() => setConnectionTab('code')}
                                className={`px-4 py-2 font-medium ${connectionTab === 'code' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                            >
                                🔢 Código
                            </button>
                        </div>

                        {connectionTab === 'qr' && (
                            <div className="flex flex-col items-center">
                                {qrDataUrl ? (
                                    <>
                                        <img src={qrDataUrl} alt="QR Code" className="w-64 h-64 rounded-lg border" />
                                        <p className="text-sm text-gray-500 mt-2">Escaneie com seu WhatsApp</p>
                                    </>
                                ) : (
                                    <div className="w-64 h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                        <span className="text-gray-500">Aguardando QR Code...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {connectionTab === 'code' && (
                            <div className="flex flex-col items-center">
                                <div className="w-full max-w-xs mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Número do WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        value={phoneNumber}
                                        onChange={e => setPhoneNumber(e.target.value)}
                                        placeholder="5511999999999"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Com código do país (ex: 55 para Brasil)</p>
                                </div>

                                <button
                                    onClick={handleRequestPairingCode}
                                    disabled={loading || !phoneNumber}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition mb-4"
                                >
                                    {loading ? 'Gerando...' : 'Gerar Código'}
                                </button>

                                {pairingCode && (
                                    <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-lg text-center">
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Digite este código no seu WhatsApp:</p>
                                        <p className="text-4xl font-mono font-bold text-green-600 dark:text-green-400 tracking-widest">
                                            {pairingCode}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2">Configurações → Aparelhos conectados → Conectar → Conectar com número</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Ações */}
                <div className="flex gap-3 mt-6">
                    {status?.connected && (
                        <>
                            <button
                                onClick={handleDisconnect}
                                disabled={loading}
                                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition"
                            >
                                Desconectar
                            </button>
                            <button
                                onClick={handleLogout}
                                disabled={loading}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                            >
                                Encerrar Sessão
                            </button>
                        </>
                    )}
                    <button
                        onClick={handleRestart}
                        disabled={loading}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition"
                    >
                        Reiniciar Bot
                    </button>
                </div>
            </div>

            {/* Configurações */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mensagens */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💬 Mensagens</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Saudação Inicial
                            </label>
                            <textarea
                                value={config.greeting}
                                onChange={e => handleChange('greeting', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Menu Principal
                            </label>
                            <textarea
                                value={config.menuMessage}
                                onChange={e => handleChange('menuMessage', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                rows={4}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirmação de Chamado
                            </label>
                            <textarea
                                value={config.confirmationMessage}
                                onChange={e => handleChange('confirmationMessage', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                rows={3}
                            />
                            <p className="text-xs text-gray-500 mt-1">Use {'{ticket_id}'} para número do chamado</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mensagem de Encerramento
                            </label>
                            <textarea
                                value={config.closingMessage}
                                onChange={e => handleChange('closingMessage', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>

                {/* Horário */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">⏰ Horário de Atendimento</h2>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Início</label>
                                <input
                                    type="time"
                                    value={config.workingHoursStart}
                                    onChange={e => handleChange('workingHoursStart', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fim</label>
                                <input
                                    type="time"
                                    value={config.workingHoursEnd}
                                    onChange={e => handleChange('workingHoursEnd', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dias de Atendimento</label>
                        <div className="flex flex-wrap gap-2">
                            {weekDays.map(day => (
                                <button
                                    key={day.id}
                                    onClick={() => toggleDay(day.id)}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium transition ${config.workingDays.includes(day.id)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Mensagem Fora do Horário
                            </label>
                            <textarea
                                value={config.unavailableMessage}
                                onChange={e => handleChange('unavailableMessage', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">⚙️ Outras Configurações</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Delay de Resposta (segundos)
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={config.autoReplyDelay}
                                onChange={e => handleChange('autoReplyDelay', parseInt(e.target.value))}
                                className="w-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">Tempo antes de enviar resposta automática</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Salvar */}
            <div className="mt-8 flex items-center gap-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition"
                >
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
                {saved && (
                    <span className="text-green-600 dark:text-green-400">✅ Salvo com sucesso!</span>
                )}
            </div>
        </div>
    );
}
