/**
 * ContactsView - Visualização de contatos do WhatsApp/Bot
 * Usa o model Contact local (não GLPI)
 */

import { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    Phone,
    Building2,
    User,
    MapPin,
    Edit3,
    Trash2,
    RefreshCw,
    X,
    Filter,
    MessageSquare,
    Camera,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { contactsApi, type Contact, type ContactFilters } from '@/app/services/api';
import { Avatar } from '@/app/components/ui/Avatar';

// Componente de campo de informação
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2 text-[12px]">
            <Icon size={13} style={{ color: 'var(--cw-text-tertiary)' }} />
            <span style={{ color: 'var(--cw-text-tertiary)' }}>{label}:</span>
            <span style={{ color: 'var(--cw-text-primary)' }}>{value}</span>
        </div>
    );
}

interface ContactsViewProps {
    onInitiateChat?: (ticket: any) => void;
}

export default function ContactsView({ onInitiateChat }: ContactsViewProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [sectors, setSectors] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [sectorFilter, setSectorFilter] = useState('');

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [formData, setFormData] = useState({
        jid: '',
        phoneNumber: '',
        name: '',
        sector: '',
        department: '',
        ramal: '',
    });

    // Profile picture loading state
    const [fetchingProfilePic, setFetchingProfilePic] = useState<Record<string, boolean>>({});

    // Buscar contatos
    const fetchContacts = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await contactsApi.list({
                search: searchTerm || undefined,
                sector: sectorFilter || undefined,
            });
            // A API pode retornar items ou diretamente um array
            if (Array.isArray(data)) {
                setContacts(data as unknown as Contact[]);
            } else {
                setContacts(data.items || []);
            }
        } catch (err: any) {
            console.error('Erro ao carregar contatos:', err);
            setError('Erro ao carregar contatos');
            // Tenta buscar sem filtro de paginação
            try {
                const fallback = await contactsApi.list();
                if (Array.isArray(fallback)) {
                    setContacts(fallback as unknown as Contact[]);
                } else {
                    setContacts(fallback.items || []);
                }
            } catch {
                setContacts([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Buscar setores
    const fetchSectors = async () => {
        try {
            const data = await contactsApi.getSectors();
            if (Array.isArray(data)) {
                setSectors(data.map((s: any) => typeof s === 'string' ? s : s.sector));
            }
        } catch (err) {
            console.error('Erro ao buscar setores:', err);
        }
    };

    useEffect(() => {
        fetchContacts();
        fetchSectors();
    }, [sectorFilter]);

    // Filtrar localmente pelo searchTerm
    const filteredContacts = contacts.filter(c => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            c.name.toLowerCase().includes(term) ||
            (c.phoneNumber || '').includes(term) ||
            c.sector.toLowerCase().includes(term) ||
            (c.department || '').toLowerCase().includes(term)
        );
    });

    // Buscar foto de perfil do WhatsApp
    const handleFetchProfilePicture = async (contact: Contact) => {
        setFetchingProfilePic(prev => ({ ...prev, [contact.id]: true }));
        try {
            const result = await contactsApi.fetchProfilePicture(contact.id);
            // Atualizar o contato na lista com a nova foto
            setContacts(prev =>
                prev.map(c => c.id === contact.id ? result.contact : c)
            );
            toast.success('Foto de perfil atualizada!');
        } catch (err: any) {
            console.error('Erro ao buscar foto de perfil:', err);
            if (err.message.includes('404') || err.message.includes('not found')) {
                toast.info('Este contato não possui foto de perfil no WhatsApp');
            } else {
                toast.error(err.message || 'Erro ao buscar foto de perfil');
            }
        } finally {
            setFetchingProfilePic(prev => ({ ...prev, [contact.id]: false }));
        }
    };

    // Abrir modal para novo contato
    const handleNew = () => {
        setEditingContact(null);
        setFormData({ jid: '', phoneNumber: '', name: '', sector: '', department: '', ramal: '' });
        setIsModalOpen(true);
    };

    // Abrir modal para editar
    const handleEdit = (contact: Contact) => {
        setEditingContact(contact);
        setFormData({
            jid: contact.jid,
            phoneNumber: contact.phoneNumber || '',
            name: contact.name,
            sector: contact.sector,
            department: contact.department || '',
            ramal: contact.ramal || '',
        });
        setIsModalOpen(true);
    };

    // Salvar contato
    const handleSave = async () => {
        if (!formData.name || !formData.sector) {
            toast.error('Nome e setor são obrigatórios');
            return;
        }

        try {
            if (editingContact) {
                await contactsApi.update(editingContact.id, {
                    name: formData.name,
                    sector: formData.sector,
                    department: formData.department || undefined,
                    ramal: formData.ramal || undefined,
                } as any);
                toast.success('Contato atualizado!');
            } else {
                if (!formData.jid && !formData.phoneNumber) {
                    toast.error('JID ou número de telefone é obrigatório');
                    return;
                }
                await contactsApi.create({
                    jid: formData.jid || `${formData.phoneNumber}@s.whatsapp.net`,
                    phoneNumber: formData.phoneNumber,
                    name: formData.name,
                    sector: formData.sector,
                    department: formData.department || undefined,
                    ramal: formData.ramal || undefined,
                } as any);
                toast.success('Contato cadastrado!');
            }
            setIsModalOpen(false);
            fetchContacts();
            fetchSectors();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar contato');
        }
    };

    // Excluir contato
    const handleDelete = async (contact: Contact) => {
        if (!confirm(`Remover o contato "${contact.name}"?`)) return;
        try {
            await contactsApi.delete(contact.id);
            toast.success('Contato removido');
            fetchContacts();
        } catch (err) {
            toast.error('Erro ao remover contato');
        }
    };

    // Formatar telefone para exibição
    const formatPhone = (contact: Contact) => {
        if (contact.phoneNumber) return contact.phoneNumber;
        // Extrair do JID
        const match = contact.jid?.match(/^(\d+)/);
        return match ? `+${match[1]}` : contact.jid;
    };

    const handleSendMessage = async (contact: Contact) => {
        try {
            // Cria um ticket para esse contato para iniciar a conversa
            const { ticketsApi } = await import('@/app/services/api');
            const ticket = await ticketsApi.create({
                title: `Conversa com ${contact.name}`,
                description: 'Conversa iniciada via Contatos',
                phoneNumber: formatPhone(contact),
                customerName: contact.name,
                sector: contact.sector,
                type: 'SUPPORT'
            });
            toast.success('Conversa iniciada!');
            if (onInitiateChat) {
                onInitiateChat(ticket);
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao iniciar conversa');
        }
    };

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--cw-bg-primary)' }}>
            {/* Header */}
            <div
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: 'var(--cw-border)', backgroundColor: 'var(--cw-bg-secondary)' }}
            >
                <div>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--cw-text-primary)' }}>
                        Contatos
                    </h2>
                    <p className="text-[12px]" style={{ color: 'var(--cw-text-tertiary)' }}>
                        {filteredContacts.length} contatos cadastrados
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchContacts}
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: 'var(--cw-text-tertiary)' }}
                        title="Atualizar"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-white transition-colors"
                        style={{ backgroundColor: 'var(--cw-accent)' }}
                    >
                        <Plus size={14} />
                        Novo Contato
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: 'var(--cw-border)' }}>
                <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1"
                    style={{ backgroundColor: 'var(--cw-bg-tertiary)' }}
                >
                    <Search size={14} style={{ color: 'var(--cw-text-tertiary)' }} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome, telefone, setor..."
                        className="bg-transparent border-none outline-none text-[13px] w-full"
                        style={{ color: 'var(--cw-text-primary)' }}
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <Filter size={13} style={{ color: 'var(--cw-text-tertiary)' }} />
                    <select
                        value={sectorFilter}
                        onChange={(e) => setSectorFilter(e.target.value)}
                        className="bg-transparent border rounded-lg px-2 py-1.5 text-[12px] outline-none"
                        style={{
                            borderColor: 'var(--cw-border)',
                            color: 'var(--cw-text-primary)',
                            backgroundColor: 'var(--cw-bg-tertiary)',
                        }}
                    >
                        <option value="">Todos os setores</option>
                        {sectors.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Lista de contatos */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full"
                            style={{ borderColor: 'var(--cw-accent)', borderTopColor: 'transparent' }}
                        />
                    </div>
                ) : error && contacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <p className="text-[14px] font-medium" style={{ color: 'var(--cw-text-primary)' }}>{error}</p>
                        <button
                            onClick={fetchContacts}
                            className="px-4 py-2 rounded-lg text-[13px] text-white"
                            style={{ backgroundColor: 'var(--cw-accent)' }}
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <User size={48} style={{ color: 'var(--cw-text-tertiary)' }} />
                        <p className="text-[14px] font-medium" style={{ color: 'var(--cw-text-primary)' }}>
                            Nenhum contato encontrado
                        </p>
                        <p className="text-[12px]" style={{ color: 'var(--cw-text-tertiary)' }}>
                            Contatos são salvos automaticamente quando um cliente entra em contato pelo bot, ou você pode cadastrar manualmente.
                        </p>
                        <button
                            onClick={handleNew}
                            className="px-4 py-2 rounded-lg text-[13px] text-white"
                            style={{ backgroundColor: 'var(--cw-accent)' }}
                        >
                            <Plus size={14} className="inline mr-1" />
                            Cadastrar contato
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {filteredContacts.map(contact => (
                            <div
                                key={contact.id}
                                className="flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md"
                                style={{
                                    backgroundColor: 'var(--cw-bg-secondary)',
                                    borderColor: 'var(--cw-border)',
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Avatar with Profile Picture */}
                                    <div className="relative group">
                                        <Avatar
                                            src={contact.profilePicUrl}
                                            fallbackText={contact.name}
                                            size="lg"
                                        />
                                        {/* Fetch Profile Picture Button - appears on hover */}
                                        <button
                                            onClick={() => handleFetchProfilePicture(contact)}
                                            disabled={fetchingProfilePic[contact.id]}
                                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                                            title="Buscar foto do WhatsApp"
                                        >
                                            {fetchingProfilePic[contact.id] ? (
                                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                                            ) : (
                                                <Camera className="w-5 h-5 text-white" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Info */}
                                    <div className="space-y-1">
                                        <h4 className="text-[14px] font-semibold" style={{ color: 'var(--cw-text-primary)' }}>
                                            {contact.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <InfoRow icon={Building2} label="Setor" value={contact.sector} />
                                            {contact.department && (
                                                <InfoRow icon={MapPin} label="Depto" value={contact.department} />
                                            )}
                                            {contact.ramal && (
                                                <InfoRow icon={Phone} label="Ramal" value={contact.ramal} />
                                            )}
                                        </div>
                                        {contact.profilePicUpdatedAt && (
                                            <p className="text-[10px]" style={{ color: 'var(--cw-text-tertiary)' }}>
                                                Foto atualizada: {new Date(contact.profilePicUpdatedAt).toLocaleDateString('pt-BR')}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleSendMessage(contact)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-white transition-colors"
                                        style={{ backgroundColor: 'var(--cw-accent)' }}
                                    >
                                        <MessageSquare size={14} />
                                        Enviar Mensagem
                                    </button>
                                    <button
                                        onClick={() => handleEdit(contact)}
                                        className="p-2 rounded-lg transition-colors"
                                        style={{ color: 'var(--cw-text-tertiary)' }}
                                        title="Editar"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(contact)}
                                        className="p-2 rounded-lg transition-colors"
                                        style={{ color: 'var(--cw-danger, #EF4444)' }}
                                        title="Remover"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de criação/edição */}
            {isModalOpen && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsModalOpen(false)} />
                    <div
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] rounded-xl shadow-2xl z-50 border"
                        style={{
                            backgroundColor: 'var(--cw-bg-secondary)',
                            borderColor: 'var(--cw-border)',
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--cw-border)' }}>
                            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--cw-text-primary)' }}>
                                {editingContact ? 'Editar Contato' : 'Novo Contato'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--cw-text-tertiary)' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="px-5 py-4 space-y-4">
                            {/* Nome */}
                            <div>
                                <label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>
                                    Nome *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                                    style={{
                                        backgroundColor: 'var(--cw-bg-tertiary)',
                                        borderColor: 'var(--cw-border)',
                                        color: 'var(--cw-text-primary)',
                                    }}
                                    placeholder="Nome completo do contato"
                                />
                            </div>

                            {/* Telefone */}
                            {!editingContact && (
                                <div>
                                    <label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>
                                        Telefone (WhatsApp) *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                                        style={{
                                            backgroundColor: 'var(--cw-bg-tertiary)',
                                            borderColor: 'var(--cw-border)',
                                            color: 'var(--cw-text-primary)',
                                        }}
                                        placeholder="5569999999999"
                                    />
                                </div>
                            )}

                            {/* Setor */}
                            <div>
                                <label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>
                                    Setor *
                                </label>
                                <input
                                    type="text"
                                    value={formData.sector}
                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                                    style={{
                                        backgroundColor: 'var(--cw-bg-tertiary)',
                                        borderColor: 'var(--cw-border)',
                                        color: 'var(--cw-text-primary)',
                                    }}
                                    placeholder="Ex: Administração, Financeiro, TI..."
                                    list="sectors-list"
                                />
                                <datalist id="sectors-list">
                                    {sectors.map(s => <option key={s} value={s} />)}
                                </datalist>
                            </div>

                            {/* Departamento + Ramal em linha */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>
                                        Departamento
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                                        style={{
                                            backgroundColor: 'var(--cw-bg-tertiary)',
                                            borderColor: 'var(--cw-border)',
                                            color: 'var(--cw-text-primary)',
                                        }}
                                        placeholder="Ex: Compras"
                                    />
                                </div>
                                <div>
                                    <label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cw-text-secondary)' }}>
                                        Ramal
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.ramal}
                                        onChange={(e) => setFormData({ ...formData, ramal: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                                        style={{
                                            backgroundColor: 'var(--cw-bg-tertiary)',
                                            borderColor: 'var(--cw-border)',
                                            color: 'var(--cw-text-primary)',
                                        }}
                                        placeholder="Ex: 2045"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--cw-border)' }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                                style={{
                                    backgroundColor: 'var(--cw-bg-tertiary)',
                                    color: 'var(--cw-text-primary)',
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-colors"
                                style={{ backgroundColor: 'var(--cw-accent)' }}
                            >
                                {editingContact ? 'Salvar' : 'Cadastrar'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
