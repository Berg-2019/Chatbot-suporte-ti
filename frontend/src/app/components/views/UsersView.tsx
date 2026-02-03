import { Users, Plus, Search, Edit2, Trash2, Mail, Phone, Shield, X, Check, LayoutDashboard, Briefcase, BarChart3, Package, FileText, HelpCircle, MessageSquare, Bot, Printer, CheckSquare, Square } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { usersApi, type User as ApiUser } from '@/app/services/api';

interface User extends Omit<ApiUser, 'role'> {
  role: 'Admin' | 'Técnico' | 'Usuário';
  status: 'active' | 'inactive';
  tickets: number; // Extended for UI
  lastAccess: string;
  permissions: string[];
}

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
  const [filterRole, setFilterRole] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    role: 'Usuário',
    password: '',
    permissions: ['dashboard', 'chat'] // Default permissions
  });

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    setAccessDenied(false);
    try {
      const data = await usersApi.getAll();
      const mapped: User[] = data.map(u => ({
        ...u,
        role: u.role === 'ADMIN' ? 'Admin' : u.role === 'AGENT' ? 'Técnico' : 'Usuário',
        status: u.active ? 'active' : 'inactive',
        tickets: 0,
        lastAccess: 'N/A',
        permissions: u.role === 'ADMIN' ? ALL_MODULES.map(m => m.id) : ((u as any).permissions || ['dashboard', 'chat']),
        phone: u.phone || (u as any).phoneNumber || '',
        department: u.department || (u as any).department || ''
      }));
      setUsers(mapped);
    } catch (err: any) {
      console.error('Failed to fetch users', err);
      if (err.message?.includes('403') || err.message?.includes('Forbidden') || err.message?.includes('admins')) {
        setAccessDenied(true);
      } else {
        setError('Erro ao carregar usuários');
        toast.error('Erro ao carregar usuários');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = filterRole === 'all' || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  const roleColors = {
    Admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    Técnico: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Usuário: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  };

  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      if (editingUserId) {
        // Mode: Edit
        await usersApi.update(editingUserId, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role === 'Admin' ? 'ADMIN' : 'AGENT',
          department: formData.department,
          permissions: formData.permissions,
          ...(formData.password ? { password: formData.password } : {})
        });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        if (!formData.password) {
          toast.error('Senha é obrigatória para novos usuários');
          return;
        }
        // Mode: Create
        await usersApi.createGlpiUser({
          login: formData.email.split('@')[0],
          password: formData.password,
          firstName: formData.name.split(' ')[0],
          lastName: formData.name.split(' ').slice(1).join(' '),
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          permissions: formData.permissions
        });
        toast.success('Usuário criado com sucesso (GLPI + Local)!');
      }

      setIsModalOpen(false);
      fetchUsers();
      resetForm();
    } catch (err) {
      toast.error(editingUserId ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário');
      console.error(err);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department || '',
      role: user.role, // 'Admin' | 'Técnico' | 'Usuário' matches select options
      password: '', // Don't allow editing password directly here, only via new input
      permissions: user.permissions
    });
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) return;

    try {
      await usersApi.delete(user.id);
      toast.success('Usuário excluído com sucesso');
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const resetForm = () => {
    setEditingUserId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      department: '',
      role: 'Usuário',
      password: '',
      permissions: ['dashboard', 'chat']
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Access denied state
  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-full">
          <Shield className="text-red-500" size={48} />
        </div>
        <h2 className="text-xl font-bold text-white">Acesso Restrito</h2>
        <p className="text-slate-400 text-center max-w-md">
          Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar usuários.
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-full">
          <Users className="text-yellow-500" size={48} />
        </div>
        <h2 className="text-xl font-bold text-white">Erro ao carregar</h2>
        <p className="text-slate-400">{error}</p>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
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
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Gestão de Usuários</h1>
          <p className="text-slate-400">Gerencie usuários e permissões do sistema</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Novo Usuário</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-blue-500" size={24} />
            <div className="text-slate-400 text-sm">Total</div>
          </div>
          <div className="text-3xl font-bold text-white">{users.length}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div className="text-slate-400 text-sm">Ativos</div>
          </div>
          <div className="text-3xl font-bold text-green-500">{users.filter(u => u.status === 'active').length}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-blue-500" size={24} />
            <div className="text-slate-400 text-sm">Técnicos</div>
          </div>
          <div className="text-3xl font-bold text-white">{users.filter(u => u.role === 'Técnico').length}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-red-500" size={24} />
            <div className="text-slate-400 text-sm">Admins</div>
          </div>
          <div className="text-3xl font-bold text-white">{users.filter(u => u.role === 'Admin').length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar usuários..."
              className="w-full bg-slate-800 text-white rounded-lg pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-slate-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as Funções</option>
            <option value="Admin">Admin</option>
            <option value="Técnico">Técnico</option>
            <option value="Usuário">Usuário</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 hover:border-slate-700/50 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                  {user.name.charAt(0)}
                </div>

                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h3 className="text-white font-semibold text-lg">{user.name}</h3>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${roleColors[user.role]}`}>
                        {user.role}
                      </span>
                      {user.status === 'active' ? (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Ativo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50">
                          <div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div> Inativo
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail size={16} />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone size={16} />
                      <span>{user.phone}</span>
                    </div>
                    <div className="text-slate-400">
                      <span className="text-slate-500 font-medium">Dept:</span> {user.department}
                    </div>
                    <div className="text-slate-400">
                      <span className="text-slate-500 font-medium">Tickets:</span> {user.tickets}
                    </div>
                  </div>

                  {/* Permissions Chips */}
                  {user.permissions && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {user.permissions.slice(0, 5).map(perm => {
                        const module = ALL_MODULES.find(m => m.id === perm);
                        return module ? (
                          <span key={perm} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
                            {module.label}
                          </span>
                        ) : null;
                      })}
                      {user.permissions.length > 5 && (
                        <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-500 rounded border border-slate-700">
                          +{user.permissions.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-slate-500 mt-2">
                    Último acesso: {user.lastAccess}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEditUser(user)}
                  className="p-2 bg-slate-800 hover:bg-blue-600 hover:text-white rounded-lg transition-colors text-slate-400">
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteUser(user)}
                  className="p-2 bg-slate-800 hover:bg-red-600 hover:text-white rounded-lg transition-colors text-slate-400">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">Nenhum usuário encontrado</p>
        </div>
      )}

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
                            <option value="Admin">Admin</option>
                          </select>
                        </div>
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
                  disabled={!formData.name || !formData.email}
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
