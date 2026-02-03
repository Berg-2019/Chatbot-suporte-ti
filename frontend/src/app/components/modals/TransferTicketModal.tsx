import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, User, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi, type User as ApiUser } from '@/app/services/api';

interface TransferTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (userId: string) => Promise<void>;
    currentTechnicianId?: string;
    ticketTitle?: string;
}

export default function TransferTicketModal({
    isOpen,
    onClose,
    onConfirm,
    currentTechnicianId,
    ticketTitle
}: TransferTicketModalProps) {
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selecteduserId, setSelectedUserId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadTechnicians();
        }
    }, [isOpen]);

    const loadTechnicians = async () => {
        setLoading(true);
        try {
            const data = await usersApi.getTechnicians();
            // Filter out current technician if known (optional, but good UX)
            // Also filter active ones
            const available = data.filter(u => u.active && u.id !== currentTechnicianId);
            setUsers(available);
        } catch (err) {
            console.error('Failed to load technicians', err);
            toast.error('Erro ao carregar técnicos');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleConfirm = async () => {
        if (!selecteduserId) return;
        await onConfirm(selecteduserId);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <RefreshCw className="text-blue-500" size={20} />
                                        Transferir Chamado
                                    </h3>
                                    {ticketTitle && (
                                        <p className="text-xs text-slate-400 mt-1 truncate max-w-[250px]">
                                            {ticketTitle}
                                        </p>
                                    )}
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Buscar técnico..."
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-white outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {loading ? (
                                        <div className="text-center py-8 text-slate-500">Carregando...</div>
                                    ) : filteredUsers.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500">Nenhum técnico encontrado</div>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                onClick={() => setSelectedUserId(user.id)}
                                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selecteduserId === user.id
                                                        ? 'bg-blue-600/20 border-blue-500/50'
                                                        : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${selecteduserId === user.id ? 'bg-blue-600' : 'bg-slate-700'
                                                    }`}>
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`font-medium ${selecteduserId === user.id ? 'text-blue-100' : 'text-slate-200'}`}>
                                                        {user.name}
                                                    </p>
                                                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                                </div>
                                                {selecteduserId === user.id && (
                                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                        <Check size={14} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!selecteduserId}
                                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                                >
                                    Confirmar Transferência
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
