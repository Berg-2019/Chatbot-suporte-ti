import { useState, useEffect } from 'react';
import { X, Search, Check, FileText, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { reportsApi, type ReportRecipient } from '@/app/services/api';
import { toast } from 'sonner';

interface ShareReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (recipientJid: string | undefined) => Promise<void>;
    reportTitle: string;
}

export default function ShareReportModal({ isOpen, onClose, onConfirm, reportTitle }: ShareReportModalProps) {
    const [recipients, setRecipients] = useState<ReportRecipient[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedJid, setSelectedJid] = useState<string | undefined>(undefined);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadRecipients();
            setSelectedJid(undefined);
        }
    }, [isOpen]);

    const loadRecipients = async () => {
        setLoading(true);
        try {
            const data = await reportsApi.getRecipients();
            setRecipients(data);
        } catch (error) {
            console.error('Erro ao carregar destinatários:', error);
            toast.error('Erro ao carregar lista de contatos');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        setSending(true);
        try {
            await onConfirm(selectedJid);
            // Success handled by parent or here? Parent usually calls api.sendReport.
            // But props say onConfirm returns Promise<void>.
            onClose();
        } catch (error) {
            // Error handled by parent
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">Encaminhar Relatório</h2>
                            <p className="text-slate-400 text-sm mt-1">{reportTitle}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
                            Selecione o Destinatário
                        </h3>

                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {/* Option: All / Default */}
                                <div
                                    onClick={() => setSelectedJid(undefined)}
                                    className={`
                            flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border
                            ${selectedJid === undefined
                                            ? 'bg-blue-600/20 border-blue-500/50'
                                            : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'}
                        `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${selectedJid === undefined ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h4 className={`font-medium ${selectedJid === undefined ? 'text-white' : 'text-slate-300'}`}>
                                                Todos os Destinatários
                                            </h4>
                                            <p className="text-xs text-slate-500">Enviar para lista padrão</p>
                                        </div>
                                    </div>
                                    {selectedJid === undefined && (
                                        <div className="bg-blue-500 rounded-full p-1">
                                            <Check size={14} className="text-white" />
                                        </div>
                                    )}
                                </div>

                                {/* Specific Recipients */}
                                {recipients.map((recipient) => (
                                    <div
                                        key={recipient.id}
                                        onClick={() => setSelectedJid(recipient.jid)}
                                        className={`
                                flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border
                                ${selectedJid === recipient.jid
                                                ? 'bg-blue-600/20 border-blue-500/50'
                                                : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'}
                            `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${selectedJid === recipient.jid ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                <User size={20} />
                                            </div>
                                            <h4 className={`font-medium ${selectedJid === recipient.jid ? 'text-white' : 'text-slate-300'}`}>
                                                {recipient.name}
                                            </h4>
                                        </div>
                                        {selectedJid === recipient.jid && (
                                            <div className="bg-blue-500 rounded-full p-1">
                                                <Check size={14} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {recipients.length === 0 && !loading && (
                            <p className="text-slate-500 text-center py-4">Nenhum contato encontrado.</p>
                        )}

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={sending || loading}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {sending ? 'Enviando...' : 'Encaminhar'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
