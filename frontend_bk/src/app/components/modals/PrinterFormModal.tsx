import { useState, useEffect } from 'react';
import { X, Save, Printer as PrinterIcon } from 'lucide-react';
import { toast } from 'sonner';
import { type Printer } from '@/app/services/api';

interface PrinterFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Partial<Printer>) => void;
    initialData?: Printer | null;
}

export default function PrinterFormModal({ isOpen, onClose, onConfirm, initialData }: PrinterFormModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        ip: '',
        port: 161,
        location: '',
        community: 'public',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                ip: initialData.ip,
                port: initialData.port || 161,
                location: initialData.location || '',
                community: 'public', // Default/hidden for now unless it's in the interface
            });
        } else {
            setFormData({
                name: '',
                ip: '',
                port: 161,
                location: '',
                community: 'public',
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.ip) {
            toast.error('Nome e IP são obrigatórios');
            return;
        }
        onConfirm(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <PrinterIcon size={20} className="text-blue-500" />
                            {initialData ? 'Editar Impressora' : 'Nova Impressora'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Nome da Impressora</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: Impressora RH"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <label className="text-sm font-medium text-slate-300">Endereço IP</label>
                            <input
                                type="text"
                                value={formData.ip}
                                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: 192.168.1.100"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Porta</label>
                            <input
                                type="number"
                                value={formData.port || 161}
                                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 161 })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="161"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Localização</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ex: Sala 101, Corredor B"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <Save size={18} />
                            Salvar
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
