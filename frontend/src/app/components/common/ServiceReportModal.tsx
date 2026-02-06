import { useState, useEffect } from 'react';
import { X, Upload, FileText, MapPin, Camera, Check, User } from 'lucide-react';
import { toast } from 'sonner';
import { ticketsApi, usersApi, type GlpiUser } from '../../services/api';

interface ServiceReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    sector?: 'TI' | 'ELECTRIC'; // New prop
}

export default function ServiceReportModal({ isOpen, onClose, onSuccess, sector = 'TI' }: ServiceReportModalProps) {
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [technicians, setTechnicians] = useState<GlpiUser[]>([]);
    const [formData, setFormData] = useState({
        location: '',
        category: sector === 'ELECTRIC' ? 'Elétrica' : 'Infraestrutura',
        description: '',
        assignedToId: '', // New field
    });

    useEffect(() => {
        if (isOpen) {
            fetchTechnicians();
            // Reset form when opening
            setFormData(prev => ({
                ...prev,
                category: sector === 'ELECTRIC' ? 'Elétrica' : 'Infraestrutura',
                assignedToId: prev.assignedToId || ''
            }));
        }
    }, [isOpen, sector]);

    const fetchTechnicians = async () => {
        try {
            const users = await usersApi.getGlpiUsers();
            setTechnicians(users);
        } catch (error) {
            console.error('Error fetching technicians:', error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create Ticket/Report
            const ticket = await ticketsApi.create({
                title: `Relatório de Serviço: ${formData.category}`,
                description: `${formData.description}`,
                phoneNumber: 'service-report@system', // Placeholder for system reports
                category: formData.category,
                type: 'SERVICE_REPORT',
                location: formData.location,
                priority: 'NORMAL',
                assignedToId: formData.assignedToId || undefined,
                files: files
            });

            // 2. Upload files if any
            if (files.length > 0) {
                toast.success('Ticket criado! Enviando anexos...');
                try {
                    await Promise.all(
                        files.map(file => ticketsApi.uploadAttachment(ticket.id, file))
                    );
                    toast.success('Anexos enviados com sucesso!');
                } catch (uploadError) {
                    console.error('Error uploading files:', uploadError);
                    toast.error('Erro ao enviar alguns anexos, mas o relatório foi registrado.');
                }
            }

            toast.success('Relatório de serviço registrado com sucesso!');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating report:', error);
            toast.error('Erro ao registrar relatório.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${sector === 'ELECTRIC' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                            <FileText className={`w-5 h-5 ${sector === 'ELECTRIC' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Relatório de Serviço {sector === 'ELECTRIC' ? '(Elétrica)' : ''}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Registre atividades externas e manutenções</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Location */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            <MapPin className="w-4 h-4 text-emerald-500" />
                            Local / Filial
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Filial Centro, Torre 05, Cliente X..."
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    {/* Technician Selection */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            <User className="w-4 h-4 text-indigo-500" />
                            Técnico Responsável
                        </label>
                        <select
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                            value={formData.assignedToId}
                            onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                        >
                            <option value="">Selecione quem realizou o serviço (Opcional)</option>
                            {technicians.map(tech => (
                                <option key={tech.id} value={tech.id}>
                                    {tech.name} {tech.realname ? `(${tech.realname})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Tipo de Serviço
                        </label>
                        <select
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            {sector === 'TI' ? (
                                <>
                                    <option value="Infraestrutura">Infraestrutura</option>
                                    <option value="Rede">Rede / Cabeamento</option>
                                    <option value="Câmeras">Câmeras / CFTV</option>
                                    <option value="Wifi">Wifi / Rádio</option>
                                    <option value="Impressora">Impressora</option>
                                    <option value="Outros">Outros</option>
                                </>
                            ) : (
                                <>
                                    <option value="Elétrica">Elétrica Geral</option>
                                    <option value="Manutenção Predial">Manutenção Predial</option>
                                    <option value="Instalação">Instalação Nova</option>
                                    <option value="Reparo">Reparo / Conserto</option>
                                    <option value="Preventiva">Preventiva</option>
                                </>
                            )}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Descrição das Atividades
                        </label>
                        <textarea
                            required
                            rows={4}
                            placeholder="Descreva detalhadamente o que foi feito..."
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    {/* Attachments */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Camera className="w-4 h-4 text-purple-500" />
                            Fotos / Evidências
                        </label>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-semibold">Clique para enviar</span> ou arraste
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {files.length > 0 ? `${files.length} arquivos selecionados` : 'Fotos, vídeos (max 50MB)'}
                                </p>
                            </div>
                            <input type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*,video/*" />
                        </label>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 text-white font-medium rounded-xl transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98] ${sector === 'ELECTRIC'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 hover:shadow-amber-500/25'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/25'
                            }`}
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Registrar Relatório
                            </>
                        )}
                    </button>

                </form>
            </div>
        </div>
    );
}
