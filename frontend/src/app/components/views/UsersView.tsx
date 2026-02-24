import { useState, useEffect } from 'react';
import { Search, Plus, User, Edit3, Trash2, RefreshCw, X, Mail, Shield, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi, type User as LocalUser } from '@/app/services/api';
import { useAuth } from '@/app/context/AuthContext';

export default function UsersView() {
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { profile } = useAuth();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<LocalUser | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT' as 'ADMIN' | 'AGENT' | 'MANAGER' | 'TECH_TI' | 'TECH_ELECT',
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.getAll();
      setUsers(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      setError('Erro ao carregar lista de agentes');
      toast.error('Erro ao carregar agentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenNew = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'AGENT',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: LocalUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Não carrega senha
      role: user.role as any,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Nome e e-mail são obrigatórios');
      return;
    }

    try {
      if (editingUser) {
        // Edit
        await usersApi.update(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          ...(formData.password ? { password: formData.password } : {})
        });
        toast.success('Agente atualizado com sucesso!');
      } else {
        // Create
        if (!formData.password) {
          toast.error('A senha é obrigatória para um novo agente');
          return;
        }
        await usersApi.create({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        });
        toast.success('Agente criado com sucesso!');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar agente');
    }
  };

  const handleDelete = async (user: LocalUser) => {
    if (!confirm(`Remover o agente "${user.name}"?`)) return;
    try {
      // Assuming we had a usersApi.delete but currently it might be deleteGlpiUser
      // Since it's local only, we might need a standard delete endpoint in api.ts
      // For now, let's just make the standard call
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('cw_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao excluir');

      toast.success('Agente removido');
      fetchUsers();
    } catch (err) {
      toast.error('Erro ao remover agente');
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'AGENT': return 'Agente';
      case 'MANAGER': return 'Gerente';
      case 'TECH_TI': return 'Técnico TI';
      case 'TECH_ELECT': return 'Técnico Elétrica';
      default: return role;
    }
  };

  if (profile !== 'admin' && profile !== 'manager') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" style={{ backgroundColor: 'var(--cw-bg-primary)' }}>
        <Shield size={48} className="mb-4 text-red-500 opacity-50" />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--cw-text-primary)' }}>Acesso Negado</h2>
        <p style={{ color: 'var(--cw-text-secondary)' }}>Você não tem permissão para gerenciar agentes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--cw-bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--cw-border)', backgroundColor: 'var(--cw-bg-secondary)' }}>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--cw-text-primary)' }}>Agentes</h2>
          <p className="text-[12px]" style={{ color: 'var(--cw-text-tertiary)' }}>
            Gerencie sua equipe e defina o que cada membro pode fazer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2 rounded-lg transition-colors hover:bg-black/5"
            style={{ color: 'var(--cw-text-tertiary)' }}
            title="Atualizar"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-white transition-colors"
            style={{ backgroundColor: 'var(--cw-accent)' }}
          >
            <Plus size={14} />
            Adicionar Agente
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: 'var(--cw-border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 max-w-md border" style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)' }}>
          <Search size={14} style={{ color: 'var(--cw-text-tertiary)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail ou cargo..."
            className="bg-transparent border-none outline-none text-[13px] w-full"
            style={{ color: 'var(--cw-text-primary)' }}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--cw-accent)' }} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Shield size={48} className="mb-4 text-red-500 opacity-50" />
            <p className="text-sm text-red-500 font-medium mb-2">{error}</p>
            <button onClick={fetchUsers} className="text-sm text-blue-500 hover:underline">Tentar Novamente</button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <User size={48} style={{ color: 'var(--cw-text-tertiary)' }} className="mb-4 opacity-50" />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--cw-text-primary)' }}>Nenhum agente encontrado</p>
            <p className="text-[12px] max-w-md" style={{ color: 'var(--cw-text-tertiary)' }}>
              Não há agentes correspondentes à sua busca. Tente alterar os termos.
            </p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--cw-border)', backgroundColor: 'var(--cw-bg-secondary)' }}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--cw-border)', backgroundColor: 'var(--cw-bg-tertiary)' }}>
                  <th className="px-4 py-3 text-[12px] font-semibold" style={{ color: 'var(--cw-text-secondary)' }}>Nome</th>
                  <th className="px-4 py-3 text-[12px] font-semibold" style={{ color: 'var(--cw-text-secondary)' }}>Email</th>
                  <th className="px-4 py-3 text-[12px] font-semibold" style={{ color: 'var(--cw-text-secondary)' }}>Cargo</th>
                  <th className="px-4 py-3 text-[12px] font-semibold" style={{ color: 'var(--cw-text-secondary)' }}>Status</th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-right" style={{ color: 'var(--cw-text-secondary)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-black/5 transition-colors" style={{ borderColor: 'var(--cw-border)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: 'var(--cw-accent)' }}>
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[13px] font-medium" style={{ color: 'var(--cw-text-primary)' }}>{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--cw-text-secondary)' }}>
                        <Mail size={13} />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded inline-flex text-[11px] font-medium" style={{ backgroundColor: 'var(--cw-bg-tertiary)', color: 'var(--cw-text-secondary)' }}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[12px]">
                        {user.active ? (
                          <><CheckCircle size={14} className="text-green-500" /> <span style={{ color: 'var(--cw-text-secondary)' }}>Ativo</span></>
                        ) : (
                          <><XCircle size={14} className="text-red-500" /> <span style={{ color: 'var(--cw-text-secondary)' }}>Inativo</span></>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 rounded transition-colors hover:bg-black/5"
                          style={{ color: 'var(--cw-text-tertiary)' }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 rounded transition-colors hover:bg-red-50"
                          style={{ color: 'var(--cw-danger, #ef4444)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={() => setIsModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] rounded-xl shadow-2xl z-50 border" style={{ backgroundColor: 'var(--cw-bg-secondary)', borderColor: 'var(--cw-border)' }}>

            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--cw-border)' }}>
              <h3 className="text-[15px] font-semibold" style={{ color: 'var(--cw-text-primary)' }}>
                {editingUser ? 'Editar Agente' : 'Adicionar Novo Agente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--cw-text-tertiary)' }} className="hover:opacity-80">
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--cw-text-secondary)' }}>Nome do Agente *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                  style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--cw-text-secondary)' }}>Endereço de E-mail *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                  style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }}
                  placeholder="email@empresa.com"
                />
              </div>

              <div>
                <label className="text-[12px] font-medium mb-1.5 flex justify-between" style={{ color: 'var(--cw-text-secondary)' }}>
                  <span>Senha {editingUser ? '(Deixe em branco para não alterar)' : '*'}</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                  style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }}
                  placeholder="********"
                />
              </div>

              <div>
                <label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--cw-text-secondary)' }}>Cargo *</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border text-[13px] outline-none"
                  style={{ backgroundColor: 'var(--cw-bg-tertiary)', borderColor: 'var(--cw-border)', color: 'var(--cw-text-primary)' }}
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="AGENT">Agente</option>
                  <option value="MANAGER">Gerente</option>
                  <option value="TECH_TI">Técnico de TI</option>
                  <option value="TECH_ELECT">Técnico Elétrica</option>
                </select>
                <p className="text-[11px] mt-2" style={{ color: 'var(--cw-text-tertiary)' }}>
                  Administradores têm acesso a todas as configurações. Agentes podem apenas ler e responder mensagens.
                </p>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--cw-border)' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                style={{ backgroundColor: 'var(--cw-bg-tertiary)', color: 'var(--cw-text-primary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--cw-accent)' }}
              >
                {editingUser ? 'Atualizar Agente' : 'Adicionar Agente'}
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
