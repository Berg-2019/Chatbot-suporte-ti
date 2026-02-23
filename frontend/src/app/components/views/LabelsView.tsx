import { useState } from 'react';
import { Plus, Search, X, Tag, Trash2, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Label {
    id: string;
    name: string;
    color: string;
    description: string;
    count: number;
}

const LABEL_COLORS = [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Verde', value: '#22C55E' },
    { name: 'Amarelo', value: '#EAB308' },
    { name: 'Vermelho', value: '#EF4444' },
    { name: 'Roxo', value: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Laranja', value: '#F97316' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Cinza', value: '#6B7280' },
];

const mockLabels: Label[] = [
    { id: '1', name: 'urgente', color: '#EF4444', description: 'Tickets de alta prioridade', count: 5 },
    { id: '2', name: 'hardware', color: '#3B82F6', description: 'Problemas de hardware', count: 12 },
    { id: '3', name: 'software', color: '#8B5CF6', description: 'Problemas de software', count: 8 },
    { id: '4', name: 'rede', color: '#22C55E', description: 'Problemas de rede e conectividade', count: 3 },
    { id: '5', name: 'impressora', color: '#F97316', description: 'Manutenção de impressoras', count: 7 },
    { id: '6', name: 'senha', color: '#EAB308', description: 'Reset de senha / acesso', count: 15 },
];

export default function LabelsView() {
    const [labels, setLabels] = useState<Label[]>(mockLabels);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', description: '', color: LABEL_COLORS[0].value });

    const filtered = labels.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = () => {
        if (!form.name) { toast.error('Nome é obrigatório'); return; }
        const normalized = form.name.toLowerCase().replace(/\s+/g, '-');

        if (editingId) {
            setLabels(prev => prev.map(l => l.id === editingId ? { ...l, name: normalized, description: form.description, color: form.color } : l));
            toast.success('Label atualizada!');
        } else {
            setLabels(prev => [...prev, { id: Date.now().toString(), name: normalized, description: form.description, color: form.color, count: 0 }]);
            toast.success('Label criada!');
        }
        setIsModalOpen(false);
        setEditingId(null);
        setForm({ name: '', description: '', color: LABEL_COLORS[0].value });
    };

    const handleEdit = (label: Label) => {
        setEditingId(label.id);
        setForm({ name: label.name, description: label.description, color: label.color });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (!confirm('Excluir esta label?')) return;
        setLabels(prev => prev.filter(l => l.id !== id));
        toast.success('Label removida!');
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>Labels</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--cw-text-tertiary)' }}>
                        Categorize e organize conversas com tags coloridas
                    </p>
                </div>
                <button
                    onClick={() => { setEditingId(null); setForm({ name: '', description: '', color: LABEL_COLORS[0].value }); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
                    style={{ backgroundColor: 'var(--cw-accent)' }}
                >
                    <Plus size={16} /> Nova Label
                </button>
            </div>

            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--cw-text-tertiary)' }} />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar labels..." className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none border"
                    style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }} />
            </div>

            {/* Labels Table */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--cw-border)' }}>
                <table className="w-full">
                    <thead>
                        <tr style={{ backgroundColor: 'var(--cw-bg-tertiary)' }}>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--cw-text-tertiary)' }}>Label</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--cw-text-tertiary)' }}>Descrição</th>
                            <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--cw-text-tertiary)' }}>Conversas</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--cw-text-tertiary)' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((label, i) => (
                            <tr key={label.id} className="group transition-colors border-t"
                                style={{ borderColor: 'var(--cw-border)' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                                        <span className="text-sm font-medium" style={{ color: 'var(--cw-text-primary)' }}>{label.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-sm" style={{ color: 'var(--cw-text-secondary)' }}>{label.description}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="text-sm font-medium" style={{ color: 'var(--cw-text-primary)' }}>{label.count}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(label)} className="p-1.5 rounded-lg" style={{ color: 'var(--cw-text-tertiary)' }}><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(label.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--cw-text-tertiary)' }}><Trash2 size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="text-center py-12">
                        <Tag size={32} className="mx-auto mb-2" style={{ color: 'var(--cw-text-tertiary)' }} />
                        <p className="text-sm" style={{ color: 'var(--cw-text-tertiary)' }}>Nenhuma label encontrada</p>
                    </div>
                )}
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
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--cw-text-primary)' }}>
                                    {editingId ? 'Editar Label' : 'Nova Label'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--cw-text-tertiary)' }}><X size={16} /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>Nome *</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                                        style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }}
                                        placeholder="Ex: urgente" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>Descrição</label>
                                    <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                                        style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }}
                                        placeholder="Descrição da label" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--cw-text-secondary)' }}>Cor</label>
                                    <div className="flex flex-wrap gap-2">
                                        {LABEL_COLORS.map(c => (
                                            <button key={c.value} onClick={() => setForm({ ...form, color: c.value })} title={c.name}
                                                className="w-7 h-7 rounded-full transition-transform"
                                                style={{ backgroundColor: c.value, transform: form.color === c.value ? 'scale(1.2)' : 'scale(1)', outline: form.color === c.value ? '2px solid var(--cw-text-primary)' : 'none', outlineOffset: '2px' }} />
                                        ))}
                                    </div>
                                </div>
                                {/* Preview */}
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>Preview</label>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                                        style={{ backgroundColor: form.color }}>
                                        <Tag size={10} /> {form.name || 'label'}
                                    </span>
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
