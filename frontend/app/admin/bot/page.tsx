/**
 * Configurar Bot Page - Configurações do Bot WhatsApp
 */

'use client';

import { useState, useEffect } from 'react';

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
    const [config, setConfig] = useState<BotConfig>(defaultConfig);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Carregar config do localStorage por enquanto
        const savedConfig = localStorage.getItem('botConfig');
        if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
        }
    }, []);

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
        // Por enquanto salva no localStorage
        // TODO: Salvar no backend
        localStorage.setItem('botConfig', JSON.stringify(config));
        await new Promise(r => setTimeout(r, 500));
        setSaving(false);
        setSaved(true);
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🤖 Configurar Bot</h1>
                <p className="text-gray-600 dark:text-gray-400">Configure as mensagens e comportamento do bot WhatsApp</p>
            </div>

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
                                Categorias de Chamado
                            </label>
                            <textarea
                                value={config.categoryPrompt}
                                onChange={e => handleChange('categoryPrompt', e.target.value)}
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

                {/* Horário de Funcionamento */}
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
