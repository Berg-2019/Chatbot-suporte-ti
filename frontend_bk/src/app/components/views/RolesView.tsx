import { Shield, Plus, Edit2, Trash2, Loader2, X, Save, Lock, CheckSquare, Square, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { rolesApi, type CustomRole, type PermissionModule } from '@/app/services/api';

export default function RolesView() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rolesData, permissionsData] = await Promise.all([
        rolesApi.list(),
        rolesApi.getPermissions(),
      ]);
      setRoles(rolesData);
      setAvailablePermissions(permissionsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Erro ao carregar roles e permissões');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role?: CustomRole) => {
    if (role) {
      if (role.isSystem) {
        alert('Roles do sistema não podem ser editadas');
        return;
      }
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions,
      });
    } else {
      setEditingRole(null);
      setFormData({ name: '', description: '', permissions: [] });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({ name: '', description: '', permissions: [] });
  };

  const handleSave = async () => {
    if (!formData.name || formData.permissions.length === 0) {
      alert('Preencha o nome e selecione pelo menos uma permissão');
      return;
    }

    try {
      setSaving(true);
      if (editingRole) {
        await rolesApi.update(editingRole.id, formData);
      } else {
        await rolesApi.create(formData);
      }
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      console.error('Failed to save role:', err);
      alert(err.message || 'Erro ao salvar role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      alert('Roles do sistema não podem ser excluídas');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta role?')) return;

    try {
      await rolesApi.delete(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete role:', err);
      alert('Erro ao excluir role');
    }
  };

  const handleTogglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleToggleModule = (module: string) => {
    const modulePermissions = availablePermissions
      .find(p => p.module === module)
      ?.actions.map(action => `${module}:${action}`) || [];

    const allSelected = modulePermissions.every(p => formData.permissions.includes(p));

    if (allSelected) {
      // Deselect all
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !modulePermissions.includes(p)),
      }));
    } else {
      // Select all
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...modulePermissions])],
      }));
    }
  };

  const handleSelectAll = () => {
    const allPermissions = availablePermissions.flatMap(module =>
      module.actions.map(action => `${module.module}:${action}`)
    );
    setFormData(prev => ({
      ...prev,
      permissions: allPermissions,
    }));
  };

  const handleClearAll = () => {
    setFormData(prev => ({
      ...prev,
      permissions: [],
    }));
  };

  const isModuleSelected = (module: string): boolean => {
    const modulePermissions = availablePermissions
      .find(p => p.module === module)
      ?.actions.map(action => `${module}:${action}`) || [];
    return modulePermissions.every(p => formData.permissions.includes(p));
  };

  const getPermissionLabel = (permission: string): string => {
    const labels: Record<string, string> = {
      view: 'Visualizar',
      create: 'Criar',
      update: 'Atualizar',
      delete: 'Deletar',
      assign: 'Atribuir',
      test: 'Testar',
      merge: 'Mesclar',
      export: 'Exportar',
      '*': 'Todas',
    };
    return labels[permission] || permission;
  };

  const getModuleLabel = (module: string): string => {
    const labels: Record<string, string> = {
      tickets: 'Tickets',
      users: 'Usuários',
      contacts: 'Contatos',
      estoque: 'Estoque',
      roles: 'Roles',
      webhooks: 'Webhooks',
      canned_responses: 'Respostas Prontas',
      reports: 'Relatórios',
      settings: 'Configurações',
      audit: 'Auditoria',
    };
    return labels[module] || module;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-7 h-7" />
              Roles e Permissões
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie roles customizadas e controle de acesso granular
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Role
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Nenhuma role cadastrada</p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Criar primeira role
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map(role => (
            <div
              key={role.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{role.name}</h3>
                    {role.isSystem && (
                      <Lock className="w-4 h-4 text-gray-400" title="Role do sistema" />
                    )}
                  </div>
                  {role.description && (
                    <p className="text-sm text-gray-600">{role.description}</p>
                  )}
                </div>
                {!role.isSystem && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenModal(role)}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(role.id, role.isSystem)}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                  <Users className="w-3 h-3" />
                  <span>{role.permissions.length} permissões</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {role.permissions.includes('*') ? (
                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-medium">
                      Todas as permissões
                    </span>
                  ) : (
                    role.permissions.slice(0, 8).map(permission => (
                      <span
                        key={permission}
                        className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-mono"
                      >
                        {permission}
                      </span>
                    ))
                  )}
                  {role.permissions.length > 8 && !role.permissions.includes('*') && (
                    <span className="text-xs text-gray-500 px-2 py-0.5">
                      +{role.permissions.length - 8} mais
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingRole ? 'Editar Role' : 'Nova Role'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Agente N1, Supervisor, etc"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da role"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Permissões <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Selecionar todas
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Limpar todas
                    </button>
                  </div>
                </div>

                <div className="border border-gray-300 rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                  {availablePermissions.map(module => (
                    <div key={module.module} className="border-b border-gray-200 last:border-0 pb-3 last:pb-0">
                      {/* Module Header */}
                      <label className="flex items-center gap-2 cursor-pointer mb-2 group">
                        <button
                          type="button"
                          onClick={() => handleToggleModule(module.module)}
                          className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded flex-1"
                        >
                          {isModuleSelected(module.module) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                          <span className="font-medium text-gray-900">
                            {getModuleLabel(module.module)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({module.actions.length})
                          </span>
                        </button>
                      </label>

                      {/* Actions */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-7">
                        {module.actions.map(action => {
                          const permission = `${module.module}:${action}`;
                          return (
                            <label
                              key={action}
                              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(permission)}
                                onChange={() => handleTogglePermission(permission)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-gray-700">
                                {getPermissionLabel(action)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  {formData.permissions.length} permissão(ões) selecionada(s)
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
