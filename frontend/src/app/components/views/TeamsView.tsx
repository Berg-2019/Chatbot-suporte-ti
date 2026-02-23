import { useState } from 'react';
import { Plus, Search, X, UsersRound, Trash2, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface Team {
    id: string;
    name: string;
    description: string;
    members: number;
    color: string;
}

const COLORS = ['#3B82F6', '#8B5CF6', '#EF4444', '#22C55E', '#EAB308', '#EC4899', '#14B8A6', '#F97316'];

const mockTeams: Team[] = [
    { id: '1', name: 'TI - Suporte', description: 'Equipe de suporte técnico de TI', members: 4, color: '#3B82F6' },
    { id: '2', name: 'Elétrica', description: 'Equipe de manutenção elétrica', members: 3, color: '#EAB308' },
    { id: '3', name: 'Gestão', description: 'Equipe de gestão e supervisão', members: 2, color: '#8B5CF6' },
];

export default function TeamsView() {
    const [teams, setTeams] = useState<Team[]>(mockTeams);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });

    const filtered = teams.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = () => {
        if (!form.name) { toast.error('Nome é obrigatório'); return; }

        if (editingId) {
            setTeams(prev => prev.map(t => t.id === editingId ? { ...t, ...form } : t));
            toast.success('Equipe atualizada!');
        } else {
            setTeams(prev => [...prev, { id: Date.now().toString(), ...form, members: 0 }]);
            toast.success('Equipe criada!');
        }
        setIsModalOpen(false);
        setEditingId(null);
        setForm({ name: '', description: '', color: COLORS[0] });
    };

    const handleEdit = (team: Team) => {
        setEditingId(team.id);
        setForm({ name: team.name, description: team.description, color: team.color });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta equipe?')) return;
        setTeams(prev => prev.filter(t => t.id !== id));
        toast.success('Equipe removida!');
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>Equipes</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--cw-text-tertiary)' }}>
                        Organize agentes em grupos por responsabilidade
                    </p>
                </div>
                <button
                    onClick={() => { setEditingId(null); setForm({ name: '', description: '', color: COLORS[0] }); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'var(--cw-accent)' }}
                >
                    <Plus size={16} /> Nova Equipe
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--cw-text-tertiary)' }} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar equipes..."
                    className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none border transition-colors"
                    style={{
                        backgroundColor: 'var(--cw-bg-tertiary)',
                        borderColor: 'var(--cw-border)',
                        color: 'var(--cw-text-primary)',
                    }}
                />
            </div>

            {/* Teams List */}
            <div className="space-y-3">
                {filtered.map(team => (
                    <div
                        key={team.id}
                        className="flex items-center gap-4 p-4 rounded-xl border transition-all group"
                        style={{ backgroundColor: 'var(--cw-bg-secondary)', borderColor: 'var(--cw-border)' }}
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: team.color }}
                        >
                            <UsersRound size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold" style={{ color: 'var(--cw-text-primary)' }}>{team.name}</h3>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--cw-text-tertiary)' }}>{team.description}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full shrink-0" style={{ backgroundColor: 'var(--cw-bg-tertiary)', color: 'var(--cw-text-secondary)' }}>
                            {team.members} membros
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(team)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--cw-text-tertiary)' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            ><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete(team.id)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--cw-text-tertiary)' }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)'; e.currentTarget.style.color = 'var(--cw-danger)'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--cw-text-tertiary)'; }}
                            ><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-16">
                        <UsersRound size={40} className="mx-auto mb-3" style={{ color: 'var(--cw-text-tertiary)' }} />
                        <p className="text-sm" style={{ color: 'var(--cw-text-tertiary)' }}>Nenhuma equipe encontrada</p>
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
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md rounded-xl border z-50 overflow-hidden"
                            style={{ backgroundColor: 'var(--cw-bg-secondary)', borderColor: 'var(--cw-border)' }}
                        >
                            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--cw-border)' }}>
                                <h3 className="text-sm font-semibold" style={{ color: 'var(--cw-text-primary)' }}>
                                    {editingId ? 'Editar Equipe' : 'Nova Equipe'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded" style={{ color: 'var(--cw-text-tertiary)' }}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>Nome *</label>
                                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
                                        style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }}
                                        placeholder="Ex: Suporte Nível 2" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>Descrição</label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                        className="w-full rounded-lg px-3 py-2 text-sm border outline-none resize-none h-20"
                                        style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }}
                                        placeholder="Descrição da equipe..." />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--cw-text-secondary)' }}>Cor</label>
                                    <div className="flex gap-2">
                                        {COLORS.map(c => (
                                            <button key={c} onClick={() => setForm({ ...form, color: c })}
                                                className="w-7 h-7 rounded-full transition-transform"
                                                style={{ backgroundColor: c, transform: form.color === c ? 'scale(1.2)' : 'scale(1)', outline: form.color === c ? '2px solid var(--cw-text-primary)' : 'none', outlineOffset: '2px' }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: 'var(--cw-border)' }}>
                                <button onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded-lg text-sm"
                                    style={{ color: 'var(--cw-text-secondary)' }}>Cancelar</button>
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
