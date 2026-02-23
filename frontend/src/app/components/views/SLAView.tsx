import { useState } from 'react';
import { Plus, X, Clock, AlertTriangle, Check, Edit2, Trash2, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface SLAPolicy {
    id: string;
    name: string;
    description: string;
    firstResponseTime: number; // minutes
    resolutionTime: number; // minutes
    priority: 'low' | 'medium' | 'high' | 'urgent';
    active: boolean;
}

const PRIORITY_MAP = {
    low: { label: 'Baixa', color: '#22C55E', bg: 'rgba(34, 197, 94, 0.1)' },
    medium: { label: 'Média', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.1)' },
    high: { label: 'Alta', color: '#F97316', bg: 'rgba(249, 115, 22, 0.1)' },
    urgent: { label: 'Urgente', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

const formatTime = (min: number) => {
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const mockPolicies: SLAPolicy[] = [
    { id: '1', name: 'Urgente', description: 'Para incidentes críticos', firstResponseTime: 15, resolutionTime: 60, priority: 'urgent', active: true },
    { id: '2', name: 'Alta Prioridade', description: 'Problemas que afetam produtividade', firstResponseTime: 30, resolutionTime: 240, priority: 'high', active: true },
    { id: '3', name: 'Média Prioridade', description: 'Solicitações padrão', firstResponseTime: 60, resolutionTime: 480, priority: 'medium', active: true },
    { id: '4', name: 'Baixa Prioridade', description: 'Melhorias e ajustes não urgentes', firstResponseTime: 120, resolutionTime: 1440, priority: 'low', active: true },
];

export default function SLAView() {
    const [policies, setPolicies] = useState<SLAPolicy[]>(mockPolicies);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', description: '', firstResponseTime: 30, resolutionTime: 240, priority: 'medium' as SLAPolicy['priority'] });

    const handleSave = () => {
        if (!form.name) { toast.error('Nome é obrigatório'); return; }
        if (editingId) {
            setPolicies(prev => prev.map(p => p.id === editingId ? { ...p, ...form } : p));
            toast.success('Política SLA atualizada!');
        } else {
            setPolicies(prev => [...prev, { id: Date.now().toString(), ...form, active: true }]);
            toast.success('Política SLA criada!');
        }
        setIsModalOpen(false);
        setEditingId(null);
    };

    const handleEdit = (p: SLAPolicy) => {
        setEditingId(p.id);
        setForm({ name: p.name, description: p.description, firstResponseTime: p.firstResponseTime, resolutionTime: p.resolutionTime, priority: p.priority });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (!confirm('Excluir esta política SLA?')) return;
        setPolicies(prev => prev.filter(p => p.id !== id));
        toast.success('Política removida!');
    };

    const toggleActive = (id: string) => {
        setPolicies(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>SLA — Acordo de Nível de Serviço</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--cw-text-tertiary)' }}>
                        Defina tempos de resposta e resolução por nível de prioridade
                    </p>
                </div>
                <button
                    onClick={() => { setEditingId(null); setForm({ name: '', description: '', firstResponseTime: 30, resolutionTime: 240, priority: 'medium' }); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: 'var(--cw-accent)' }}
                >
                    <Plus size={16} /> Nova Política
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(PRIORITY_MAP).map(([key, val]) => {
                    const policy = policies.find(p => p.priority === key && p.active);
                    return (
                        <div key={key} className="rounded-xl border p-4" style={{ borderColor: 'var(--cw-border)', backgroundColor: 'var(--cw-bg-secondary)' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: val.color }} />
                                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: val.color }}>{val.label}</span>
                            </div>
                            {policy ? (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={12} style={{ color: 'var(--cw-text-tertiary)' }} />
                                        <span className="text-xs" style={{ color: 'var(--cw-text-secondary)' }}>Resposta: <strong style={{ color: 'var(--cw-text-primary)' }}>{formatTime(policy.firstResponseTime)}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Timer size={12} style={{ color: 'var(--cw-text-tertiary)' }} />
                                        <span className="text-xs" style={{ color: 'var(--cw-text-secondary)' }}>Resolução: <strong style={{ color: 'var(--cw-text-primary)' }}>{formatTime(policy.resolutionTime)}</strong></span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>Não definido</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Policies list */}
            <div className="space-y-3">
                {policies.map(policy => {
                    const prio = PRIORITY_MAP[policy.priority];
                    return (
                        <div key={policy.id} className="flex items-center gap-4 p-4 rounded-xl border transition-all group"
                            style={{ backgroundColor: 'var(--cw-bg-secondary)', borderColor: 'var(--cw-border)', opacity: policy.active ? 1 : 0.5 }}>
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: prio.bg }}>
                                <AlertTriangle size={18} style={{ color: prio.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold" style={{ color: 'var(--cw-text-primary)' }}>{policy.name}</h3>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: prio.bg, color: prio.color }}>{prio.label}</span>
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--cw-text-tertiary)' }}>{policy.description}</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="text-center">
                                    <p className="text-[10px] uppercase font-semibold" style={{ color: 'var(--cw-text-tertiary)' }}>Resposta</p>
                                    <p className="text-sm font-bold" style={{ color: 'var(--cw-text-primary)' }}>{formatTime(policy.firstResponseTime)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] uppercase font-semibold" style={{ color: 'var(--cw-text-tertiary)' }}>Resolução</p>
                                    <p className="text-sm font-bold" style={{ color: 'var(--cw-text-primary)' }}>{formatTime(policy.resolutionTime)}</p>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => toggleActive(policy.id)} className="p-1.5 rounded-lg" style={{ color: policy.active ? 'var(--cw-success)' : 'var(--cw-text-tertiary)' }}
                                    title={policy.active ? 'Desativar' : 'Ativar'}>
                                    <Check size={14} />
                                </button>
                                <button onClick={() => handleEdit(policy)} className="p-1.5 rounded-lg" style={{ color: 'var(--cw-text-tertiary)' }}><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(policy.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--cw-text-tertiary)' }}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsModalOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md rounded-xl border z-50"
                            style={{ backgroundColor: 'var(--cw-bg-secondary)', borderColor: 'var(--cw-border)' }}
                        >
                            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--cw-border)' }}>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--cw-text-primary)' }}>{editingId ? 'Editar SLA' : 'Nova Política SLA'}</h3>
                                <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--cw-text-tertiary)' }}><X size={16} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>Nome *</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                                        style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }}
                                        placeholder="Ex: Alta Prioridade" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>Descrição</label>
                                    <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                                        style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }} />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>Prioridade</label>
                                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as SLAPolicy['priority'] })}
                                        className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                                        style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }}>
                                        <option value="low">Baixa</option>
                                        <option value="medium">Média</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>Primeira Resposta (min)</label>
                                        <input type="number" value={form.firstResponseTime} onChange={e => setForm({ ...form, firstResponseTime: Number(e.target.value) })}
                                            className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                                            style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>Resolução (min)</label>
                                        <input type="number" value={form.resolutionTime} onChange={e => setForm({ ...form, resolutionTime: Number(e.target.value) })}
                                            className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                                            style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: 'var(--cw-border)' }}>
                                <button onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded-lg text-sm" style={{ color: 'var(--cw-text-secondary)' }}>Cancelar</button>
                                <button onClick={handleSave} className="px-4 py-1.5 rounded-lg text-sm text-white font-medium flex items-center gap-1"
                                    style={{ backgroundColor: 'var(--cw-accent)' }}>
                                    <Check size={14} /> {editingId ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
