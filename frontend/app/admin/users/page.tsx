/**
 * Usuários Page - Gestão de usuários com criação GLPI
 */

'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'AGENT';
    technicianLevel?: string;
    active: boolean;
    glpiUserId?: number;
    createdAt: string;
}

interface GlpiGroup {
    id: number;
    name: string;
    completename: string;
}

interface CreateUserForm {
    login: string;
    password: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    groupId: number | null;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<GlpiGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'ADMIN' | 'AGENT'>('all');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState<CreateUserForm>({
        login: '',
        password: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        groupId: null,
    });

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'AGENT' as 'ADMIN' | 'AGENT',
        active: true,
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [usersRes, groupsRes] = await Promise.all([
                usersApi.list(),
                usersApi.groups().catch(() => ({ data: [] })),
            ]);
            setUsers(usersRes.data);
            setGroups(groupsRes.data || []);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }

    async function toggleUserStatus(userId: string) {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        try {
            await usersApi.update(userId, { active: !user.active });
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, active: !u.active } : u
            ));
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
        }
    }

    function openEditModal(user: User) {
        setEditingUser(user);
        setEditForm({
            name: user.name,
            email: user.email || '',
            password: '',
            role: user.role,
            active: user.active,
        });
        setShowEditModal(true);
        setError('');
        setSuccess('');
    }

    async function handleUpdateUser(e: React.FormEvent) {
        e.preventDefault();
        if (!editingUser) return;

        setError('');
        setSuccess('');
        setLoading(true);

        try {
            // Only include password if it was changed
            const updateData: Record<string, unknown> = {
                name: editForm.name,
                email: editForm.email,
                role: editForm.role,
                active: editForm.active,
            };
            if (editForm.password) {
                updateData.password = editForm.password;
            }
            await usersApi.update(editingUser.id, updateData);

            setUsers(prev => prev.map(u =>
                u.id === editingUser.id ? { ...u, ...editForm } : u
            ));

            setSuccess('Usuário atualizado com sucesso!');
            setTimeout(() => {
                setShowEditModal(false);
                setSuccess('');
            }, 1500);
        } catch (error: any) {
            setError(error.response?.data?.message || 'Erro ao atualizar usuário');
        } finally {
            setLoading(false);
        }
    }

    function openDeleteModal(user: User) {
        setUserToDelete(user);
        setShowDeleteModal(true);
        setError('');
    }

    async function handleDeleteUser() {
        if (!userToDelete) return;

        setDeleting(true);
        setError('');

        try {
            await usersApi.delete(userToDelete.id);
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            setShowDeleteModal(false);
            setUserToDelete(null);
            setSuccess('Usuário deletado com sucesso!');
            setTimeout(() => setSuccess(''), 2000);
        } catch (error: any) {
            setError(error.response?.data?.message || 'Erro ao deletar usuário');
        } finally {
            setDeleting(false);
        }
    }

    async function handleCreateUser(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSuccess('');
        setCreating(true);

        try {
            const result = await usersApi.createGlpi({
                login: form.login,
                password: form.password,
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email || undefined,
                phone: form.phone || undefined,
                groupId: form.groupId || undefined,
            });

            if (result.data.success) {
                setSuccess(`Usuário criado com sucesso! GLPI ID: ${result.data.glpiId}`);
                setForm({
                    login: '',
                    password: '',
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    groupId: null,
                });
                loadData();
                setTimeout(() => {
                    setShowModal(false);
                    setSuccess('');
                }, 2000);
            }
        } catch (error: any) {
            setError(error.response?.data?.message || 'Erro ao criar usuário');
        } finally {
            setCreating(false);
        }
    }

    const filteredUsers = users.filter(u => {
        const matchesFilter = filter === 'all' || u.role === filter;
        const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    if (loading && users.length === 0) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">👥 Gestão de Usuários</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Gerencie os usuários sincronizados do GLPI</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center gap-2"
                >
                    <span>➕</span> Criar Usuário GLPI
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'ADMIN', 'AGENT'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === f
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {f === 'all' ? 'Todos' : f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabela de Usuários */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="text-left px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Usuário</th>
                                <th className="text-left px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Role</th>
                                <th className="text-left px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                                <th className="text-left px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">GLPI</th>
                                <th className="text-right px-4 md:px-6 py-3 text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 md:px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base shrink-0">
                                                {user.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN'
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.active
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                            }`}>
                                            {user.active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {user.glpiUserId ? `#${user.glpiUserId}` : '-'}
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition"
                                                title="Editar"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(user)}
                                                className="p-1 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition"
                                                title="Deletar"
                                            >
                                                🗑️
                                            </button>
                                            <button
                                                onClick={() => toggleUserStatus(user.id)}
                                                className={`px-3 py-1 text-xs font-medium rounded transition ${user.active
                                                    ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                                                    : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                                                    }`}
                                            >
                                                {user.active ? 'Desativar' : 'Ativar'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhum usuário encontrado
                    </div>
                )}
            </div>

            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Mostrando {filteredUsers.length} de {users.length} usuários
            </div>

            {/* Modal Editar Usuário */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">✏️ Editar Usuário</h2>
                        </div>

                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm">
                                    {success}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="usuario@empresa.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nova Senha <span className="text-gray-400 font-normal">(deixe vazio para manter a atual)</span>
                                </label>
                                <input
                                    type="password"
                                    value={editForm.password}
                                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Função</label>
                                <select
                                    value={editForm.role}
                                    onChange={e => setEditForm({ ...editForm, role: e.target.value as 'ADMIN' | 'AGENT' })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="AGENT">Agente (Técnico)</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editForm.active}
                                        onChange={e => setEditForm({ ...editForm, active: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Usuário Ativo</span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Deletar Usuário */}
            {showDeleteModal && userToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🗑️ Deletar Usuário</h2>
                        </div>

                        <div className="p-6">
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <p className="text-gray-700 dark:text-gray-300 mb-4">
                                Tem certeza que deseja deletar o usuário <strong>{userToDelete.name}</strong>?
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Esta ação não pode ser desfeita. O usuário será removido permanentemente do sistema.
                            </p>

                            <div className="flex gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setUserToDelete(null);
                                        setError('');
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition"
                                >
                                    {deleting ? 'Deletando...' : 'Deletar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Criar Usuário */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">➕ Criar Usuário GLPI</h2>
                            <p className="text-sm text-gray-500">O usuário será criado no GLPI e sincronizado localmente</p>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-sm">
                                    {success}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Login *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.login}
                                        onChange={e => setForm({ ...form, login: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="usuario"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha *</label>
                                    <input
                                        type="password"
                                        required
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                                    <input
                                        type="text"
                                        value={form.firstName}
                                        onChange={e => setForm({ ...form, firstName: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="João"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sobrenome</label>
                                    <input
                                        type="text"
                                        value={form.lastName}
                                        onChange={e => setForm({ ...form, lastName: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Silva"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="joao@empresa.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grupo</label>
                                <select
                                    value={form.groupId || ''}
                                    onChange={e => setForm({ ...form, groupId: e.target.value ? Number(e.target.value) : null })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Selecione um grupo</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.completename || g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition"
                                >
                                    {creating ? 'Criando...' : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
