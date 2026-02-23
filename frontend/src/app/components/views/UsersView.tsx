import { Users, Plus, Search, Mail, Shield, X, Check, LayoutDashboard, Briefcase, BarChart3, Package, FileText, HelpCircle, MessageSquare, Bot, Printer, Edit2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { usersApi, type GlpiUser } from '@/app/services/api';

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'gestao', label: 'Gestão', icon: Briefcase },
  { id: 'metricas', label: 'Métricas', icon: BarChart3 },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'relatorios', label: 'Relatórios', icon: FileText },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'chat', label: 'Chat Equipe', icon: MessageSquare },
  { id: 'bot', label: 'Configurar Bot', icon: Bot },
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'impressoras', label: 'Impressoras', icon: Printer },
];

export default function UsersView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '', // Login/username personalizado
    email: '',
    phone: '',
    department: '',
    role: 'Usuário',
    password: '',
    permissions: ['dashboard', 'chat'], // Default permissions
    groupId: '' // GLPI Group ID
  });

  const [glpiUsers, setGlpiUsers] = useState<GlpiUser[]>([]);
  const [glpiGroups, setGlpiGroups] = useState<{ id: number; name: string; completename: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGlpiUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.getGlpiUsers();
      const groups = await usersApi.getGroups();
      setGlpiUsers(data);
      setGlpiGroups(groups);
    } catch (err: any) {
      console.error('Failed to fetch GLPI users', err);
      setError('Erro ao carregar usuários do GLPI');
      toast.error('Erro ao carregar usuários do GLPI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlpiUsers();
  }, []);

  // Usuários de sistema que não devem aparecer na lista
  const systemUsers = ['glpi', 'glpi-system', 'post-only', 'tech', 'normal'];

  const filteredUsers = glpiUsers.filter(user => {
    // Filtra usuários de sistema
    if (systemUsers.includes(user.name.toLowerCase())) return false;

    const fullName = user.firstname && user.realname
      ? `${user.firstname} ${user.realname}`
      : user.name;
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      if (editingUserId) {
        // Mode: Edit - Atualizar no GLPI e local
        const nameParts = formData.name.split(' ');
        // Map frontend role to backend format
        const backendRole = formData.role === 'Admin' ? 'ADMIN' : 'AGENT';

        await usersApi.updateGlpiUser(editingUserId, {
          firstname: nameParts[0],
          realname: nameParts.slice(1).join(' '),
          phone: formData.phone,
          email: formData.email,
          department: formData.department,
          role: backendRole,
          permissions: formData.permissions,
          password: formData.password && formData.password.trim() ? formData.password : undefined, // Só envia se tiver senha não-vazia
          groupId: formData.groupId ? Number(formData.groupId) : undefined
        });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        if (!formData.password) {
          toast.error('Senha é obrigatória para novos usuários');
          return;
        }
        if (!formData.username) {
          toast.error('Username é obrigatório para novos usuários');
          return;
        }
        // Mode: Create
        // Map frontend role to backend format
        const backendRole = formData.role === 'Admin' ? 'ADMIN' : 'AGENT';

        await usersApi.createGlpiUser({
          login: formData.username,
          password: formData.password,
          firstName: formData.name.split(' ')[0],
          lastName: formData.name.split(' ').slice(1).join(' '),
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          permissions: formData.permissions,
          role: backendRole,
          groupId: formData.groupId ? Number(formData.groupId) : undefined
        });
        toast.success('Usuário criado com sucesso no GLPI!');
      }

      setIsModalOpen(false);
      fetchGlpiUsers();
      resetForm();
    } catch (err: any) {
      // Tentar extrair mensagem de erro do backend
      const errorMessage = err?.message || err?.error ||
        (editingUserId ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário');
      toast.error(errorMessage);
      console.error('Erro:', err);
    }
  };

  const resetForm = () => {
    setEditingUserId(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      phone: '',
      department: '',
      role: 'Usuário',
      password: '',
      permissions: ['dashboard', 'chat'],
      groupId: ''
    });
  };

  const togglePermission = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(moduleId)
        ? prev.permissions.filter(p => p !== moduleId)
        : [...prev.permissions, moduleId]
    }));
  };

  const handleEditUser = (user: GlpiUser) => {
    console.log('Editing user:', user); // Debug log
    setEditingUserId(String(user.id));
    const fullName = user.firstname && user.realname
      ? `${user.firstname} ${user.realname}`
      : user.name;

    // Map GLPI group to frontend role
    let roleValue = 'Usuário';
    if (user.groups?.some(g => g.name?.toLowerCase().includes('admin') || g.name?.toLowerCase().includes('administrador'))) {
      roleValue = 'Admin';
    } else if (user.groups?.some(g => g.name?.toLowerCase().includes('manager') || g.name?.toLowerCase().includes('gerente'))) {
      roleValue = 'Gerente';
    } else if (user.groups?.some(g => g.name?.toLowerCase().includes('tech') || g.name?.toLowerCase().includes('técnico'))) {
      roleValue = 'Técnico';
    }

    setFormData({
      name: fullName,
      username: user.name,
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
      role: roleValue,
      password: '',
      permissions: user.permissions || ['dashboard', 'chat'],
      groupId: user.groups?.[0]?.id ? String(user.groups[0].id) : ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (user: GlpiUser) => {
    const fullName = user.firstname && user.realname
      ? `${user.firstname} ${user.realname}`
      : user.name;
    if (!confirm(`Tem certeza que deseja excluir o usuário ${fullName}?`)) return;

    try {
      await usersApi.deleteGlpiUser(String(user.id));
      toast.success('Usuário excluído com sucesso do GLPI');
      fetchGlpiUsers();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir usuário do GLPI');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--cw-border)', borderTopColor: 'var(--cw-accent)' }}></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="p-4 rounded-full" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
          <Users style={{ color: '#EAB308' }} size={40} />
        </div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--cw-text-primary)' }}>Erro ao carregar contatos</h2>
        <p className="text-sm" style={{ color: 'var(--cw-text-tertiary)' }}>{error}</p>
        <button
          onClick={fetchGlpiUsers}
          className="px-4 py-2 text-white text-sm rounded-lg font-medium"
          style={{ backgroundColor: 'var(--cw-accent)' }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>Contatos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--cw-text-tertiary)' }}>Gerencie contatos e usuários do sistema</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--cw-accent)' }}
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Novo Contato</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--cw-bg-secondary)', borderColor: 'var(--cw-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} style={{ color: 'var(--cw-accent)' }} />
            <span className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>Total</span>
          </div>
          <span className="text-2xl font-bold" style={{ color: 'var(--cw-text-primary)' }}>{glpiUsers.length}</span>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--cw-bg-secondary)', borderColor: 'var(--cw-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--cw-success)' }} />
            <span className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>Ativos</span>
          </div>
          <span className="text-2xl font-bold" style={{ color: 'var(--cw-success)' }}>{glpiUsers.filter(u => u.is_active).length}</span>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--cw-bg-secondary)', borderColor: 'var(--cw-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--cw-text-tertiary)' }} />
            <span className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>Inativos</span>
          </div>
          <span className="text-2xl font-bold" style={{ color: 'var(--cw-text-tertiary)' }}>{glpiUsers.filter(u => !u.is_active).length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--cw-text-tertiary)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, email ou telefone..."
            className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none border"
            style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }}
          />
        </div>
        <button
          onClick={fetchGlpiUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-secondary)' }}
        >
          <Shield size={14} /> Atualizar GLPI
        </button>
      </div>

      {/* Contacts Table — Chatwoot style */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--cw-border)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: 'var(--cw-bg-tertiary)' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--cw-text-tertiary)' }}>Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--cw-text-tertiary)' }}>Contato</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--cw-text-tertiary)' }}>Setor</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--cw-text-tertiary)' }}>Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--cw-text-tertiary)' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => {
              const fullName = user.firstname && user.realname
                ? `${user.firstname} ${user.realname}`
                : user.name;
              const initial = (user.firstname || user.name || '?').charAt(0).toUpperCase();
              const sectorName = user.groups?.[0]?.name || user.department || '—';

              return (
                <tr key={user.id} className="group border-t transition-colors"
                  style={{ borderColor: 'var(--cw-border)' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {/* Nome */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                        style={{ backgroundColor: 'var(--cw-accent)' }}>
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--cw-text-primary)' }}>{fullName}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--cw-text-tertiary)' }}>@{user.name}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contato */}
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <p className="text-sm truncate" style={{ color: 'var(--cw-text-primary)' }}>{user.email || '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--cw-text-tertiary)' }}>{user.phone || '—'}</p>
                    </div>
                  </td>

                  {/* Setor */}
                  <td className="px-4 py-3">
                    <span className="text-sm" style={{ color: 'var(--cw-text-secondary)' }}>{sectorName}</span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--cw-success)' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--cw-success)' }} /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: 'var(--cw-bg-tertiary)', color: 'var(--cw-text-tertiary)' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--cw-text-tertiary)' }} /> Inativo
                      </span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--cw-text-tertiary)' }}
                      ><Edit2 size={14} /></button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--cw-text-tertiary)' }}
                      ><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12" style={{ backgroundColor: 'var(--cw-bg-secondary)' }}>
            <Users size={32} className="mx-auto mb-2" style={{ color: 'var(--cw-text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--cw-text-tertiary)' }}>Nenhum contato encontrado</p>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="text-blue-500" /> {editingUserId ? 'Editar Usuário' : 'Criar Novo Usuário'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-0">
                <div className="flex flex-col lg:flex-row h-full">
                  {/* Left Side: Form */}
                  <div className="flex-1 p-6 space-y-6 border-r border-slate-800">
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Dados Básicos</h4>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Nome Completo *</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white outline-none focus:border-blue-500 transition-colors"
                            placeholder="Ex: João Silva"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">
                            Username (Login) {!editingUserId && '*'}
                          </label>
                          <input
                            type="text"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white outline-none focus:border-blue-500 transition-colors"
                            placeholder="Ex: joao.silva"
                            disabled={!!editingUserId}
                          />
                          {!editingUserId && (
                            <p className="text-xs text-slate-500">Nome de usuário para login no GLPI</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Email *</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white outline-none focus:border-blue-500 transition-colors"
                            placeholder="joao@empresa.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Telefone</label>
                          <input
                            type="text"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white outline-none focus:border-blue-500 transition-colors"
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Senha {editingUserId && <span className="text-xs text-slate-500 font-normal">(deixe em branco para manter)</span>}</label>
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={formData.password || ''}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white outline-none focus:border-blue-500 transition-colors"
                          placeholder={editingUserId ? "Nova senha (opcional)" : "Senha de acesso"}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Departamento</label>
                          <select
                            value={formData.department}
                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white outline-none focus:border-blue-500 transition-colors"
                          >
                            <option value="">Selecione...</option>
                            <option value="TI">TI</option>
                            <option value="RH">RH</option>
                            <option value="Financeiro">Financeiro</option>
                            <option value="Vendas">Vendas</option>
                            <option value="Operações">Operações</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300">Função</label>
                          <select
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white outline-none focus:border-blue-500 transition-colors"
                          >
                            <option value="Usuário">Usuário</option>
                            <option value="Técnico">Técnico</option>
                            <option value="Gerente">Gerente</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Grupo GLPI</label>
                        <select
                          value={formData.groupId}
                          onChange={e => setFormData({ ...formData, groupId: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white outline-none focus:border-blue-500 transition-colors"
                        >
                          <option value="">Selecione um grupo...</option>
                          {glpiGroups.map(group => (
                            <option key={group.id} value={group.id}>
                              {group.completename}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Permissões de Acesso</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {ALL_MODULES.map(module => {
                          const isSelected = formData.permissions.includes(module.id);
                          return (
                            <div
                              key={module.id}
                              onClick={() => togglePermission(module.id)}
                              className={`
                                flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all
                                ${isSelected
                                  ? 'bg-blue-600/10 border-blue-500/50 text-white'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'}
                              `}
                            >
                              <div className={`
                                w-5 h-5 rounded flex items-center justify-center border transition-colors
                                ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-600'}
                              `}>
                                {isSelected && <Check size={14} className="text-white" />}
                              </div>
                              <span className="text-sm font-medium">{module.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Preview */}
                  <div className="w-full lg:w-80 bg-slate-950 p-6 border-l border-slate-800 flex flex-col">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Preview do Menu</h4>

                    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col">
                      {/* Fake Sidebar Header */}
                      <div className="p-4 border-b border-slate-800 bg-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <LayoutDashboard size={18} className="text-white" />
                          </div>
                          <div>
                            <div className="h-2 w-20 bg-slate-700 rounded mb-1"></div>
                            <div className="h-1.5 w-12 bg-slate-800 rounded"></div>
                          </div>
                        </div>
                      </div>

                      {/* Fake Sidebar Items */}
                      <div className="p-3 space-y-1 overflow-y-auto custom-scrollbar flex-1">
                        {ALL_MODULES.filter(m => formData.permissions.includes(m.id)).map(module => {
                          const Icon = module.icon;
                          return (
                            <div key={module.id} className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 bg-slate-800/50 border border-slate-700/50">
                              <Icon size={16} className="text-slate-400" />
                              <span className="text-xs font-medium">{module.label}</span>
                            </div>
                          );
                        })}
                        {formData.permissions.length === 0 && (
                          <div className="text-center py-10 px-4">
                            <p className="text-xs text-slate-600">Nenhum módulo selecionado. O usuário não verá nada no menu.</p>
                          </div>
                        )}
                      </div>

                      {/* Fake User Profile Bottom */}
                      <div className="p-3 border-t border-slate-800 bg-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-white truncate w-32">{formData.name || 'Nome do Usuário'}</p>
                            <p className="text-[10px] text-slate-500 truncate w-32">{formData.email || 'email@exemplo.com'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-900/30 rounded-lg">
                      <p className="text-xs text-blue-300">
                        <span className="font-bold">Info:</span> O usuário terá acesso apenas aos {formData.permissions.length} módulos visualizados acima.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={!formData.name || (!editingUserId && !formData.email)}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Check size={18} /> {editingUserId ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
