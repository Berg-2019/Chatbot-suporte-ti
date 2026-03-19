import { Settings, Save, Plus, Edit2, Trash2, Search, Loader2, RefreshCw, AlertCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { settingsApi, type Setting } from '@/app/services/api';
import { toast } from 'sonner';

export default function SettingsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    category: 'general',
    dataType: 'string' as 'string' | 'number' | 'boolean' | 'json',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [settingToDelete, setSettingToDelete] = useState<string | null>(null);

  // Initialize defaults confirmation modal
  const [initializeConfirmModal, setInitializeConfirmModal] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [selectedCategory]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const data = await settingsApi.getAll(category);
      setSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError('Erro ao carregar configurações');
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (setting?: Setting) => {
    if (setting) {
      setEditingSetting(setting);
      setFormData({
        key: setting.key,
        value: setting.value,
        description: setting.description || '',
        category: setting.category,
        dataType: setting.dataType,
      });
    } else {
      setEditingSetting(null);
      setFormData({
        key: '',
        value: '',
        description: '',
        category: 'general',
        dataType: 'string',
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSetting(null);
    setFormData({
      key: '',
      value: '',
      description: '',
      category: 'general',
      dataType: 'string',
    });
    setFormErrors({});
  };

  // Validate form data based on dataType
  const validateFormData = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.key.trim()) {
      errors.key = 'Chave é obrigatória';
    }

    if (!formData.value.trim()) {
      errors.value = 'Valor é obrigatório';
    }

    // Validate based on data type
    if (formData.value.trim()) {
      switch (formData.dataType) {
        case 'number':
          if (isNaN(Number(formData.value))) {
            errors.value = 'Valor deve ser um número válido';
          }
          break;
        case 'boolean':
          if (formData.value.toLowerCase() !== 'true' && formData.value.toLowerCase() !== 'false') {
            errors.value = 'Valor deve ser "true" ou "false"';
          }
          break;
        case 'json':
          try {
            JSON.parse(formData.value);
          } catch (e) {
            errors.value = 'JSON inválido. Verifique a sintaxe.';
          }
          break;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateFormData()) {
      toast.error('Corrija os erros no formulário');
      return;
    }

    try {
      setSaving(true);
      if (editingSetting) {
        await settingsApi.update(editingSetting.key, formData);
        toast.success('Configuração atualizada com sucesso');
      } else {
        await settingsApi.upsert(formData);
        toast.success('Configuração criada com sucesso');
      }
      handleCloseModal();
      fetchSettings();
    } catch (err: any) {
      console.error('Failed to save setting:', err);
      toast.error(err.message || 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (key: string) => {
    setSettingToDelete(key);
    setDeleteConfirmModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!settingToDelete) return;

    try {
      await settingsApi.delete(settingToDelete);
      toast.success('Configuração excluída com sucesso');
      fetchSettings();
    } catch (err: any) {
      console.error('Failed to delete setting:', err);
      toast.error(err.message || 'Erro ao excluir configuração');
    } finally {
      setDeleteConfirmModal(false);
      setSettingToDelete(null);
    }
  };

  const handleInitializeDefaultsClick = () => {
    setInitializeConfirmModal(true);
  };

  const handleInitializeDefaultsConfirm = async () => {
    try {
      setSaving(true);
      await settingsApi.initializeDefaults();
      toast.success('Configurações padrão inicializadas com sucesso');
      fetchSettings();
    } catch (err: any) {
      console.error('Failed to initialize defaults:', err);
      toast.error(err.message || 'Erro ao inicializar configurações padrão');
    } finally {
      setSaving(false);
      setInitializeConfirmModal(false);
    }
  };

  const filteredSettings = settings.filter(setting =>
    !searchTerm ||
    setting.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (setting.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    setting.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(settings.map(s => s.category)));
  const categoriesWithCount = categories.map(cat => ({
    name: cat,
    count: settings.filter(s => s.category === cat).length,
  }));

  const renderValue = (setting: Setting) => {
    const value = setting.value;
    const maxLength = 60;

    if (setting.dataType === 'json') {
      try {
        const parsed = JSON.parse(value);
        const preview = JSON.stringify(parsed, null, 2);
        return preview.length > maxLength
          ? <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{preview.slice(0, maxLength)}...</span>
          : <pre className="font-mono text-xs bg-gray-100 px-2 py-1 rounded inline-block">{preview}</pre>;
      } catch {
        return <span className="text-red-500 font-mono text-sm">{value}</span>;
      }
    }

    if (setting.dataType === 'boolean') {
      const isTrue = value.toLowerCase() === 'true';
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${isTrue ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
          {isTrue ? '✓ Habilitado' : '✗ Desabilitado'}
        </span>
      );
    }

    return <span className="font-mono text-sm">{value.length > maxLength ? `${value.slice(0, maxLength)}...` : value}</span>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 text-white rounded-lg">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
            <p className="text-sm text-gray-600">
              Gerencie configurações dinâmicas do sistema
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInitializeDefaultsClick}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Inicializar Padrões
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Configuração
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar configurações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'all'
            ? 'bg-indigo-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          Todas ({settings.length})
        </button>
        {categoriesWithCount.map(cat => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat.name
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : filteredSettings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchTerm
            ? 'Nenhuma configuração encontrada'
            : 'Nenhuma configuração cadastrada. Clique em "Inicializar Padrões" para começar.'}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chave
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSettings.map((setting) => (
                <tr key={setting.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-gray-900">{setting.key}</span>
                      <span className="text-xs text-gray-500">{setting.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {renderValue(setting)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {setting.description || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {setting.dataType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(setting)}
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(setting.key)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingSetting ? 'Editar Configuração' : 'Nova Configuração'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chave *
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  disabled={!!editingSetting}
                  placeholder="ex: bot.greeting.message"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    formErrors.key ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.key && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.key}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="general">general</option>
                    <option value="bot">bot</option>
                    <option value="sla">sla</option>
                    <option value="email">email</option>
                    <option value="notifications">notifications</option>
                    <option value="system">system</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Dado *
                  </label>
                  <select
                    value={formData.dataType}
                    onChange={(e) => setFormData({ ...formData, dataType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="json">json</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor *
                </label>
                <textarea
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={
                    formData.dataType === 'json'
                      ? '{"exemplo": "valor"}'
                      : formData.dataType === 'boolean'
                        ? 'true ou false'
                        : formData.dataType === 'number'
                          ? '123'
                          : 'Digite o valor'
                  }
                  rows={formData.dataType === 'json' ? 6 : 3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm ${
                    formErrors.value ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.value && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.value}</p>
                )}
                {formData.dataType === 'json' && !formErrors.value && formData.value && (
                  <p className="text-green-600 text-xs mt-1">✓ JSON válido</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da configuração"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.key || !formData.value}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold">Confirmar Exclusão</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir a configuração <strong>{settingToDelete}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Initialize Defaults Confirmation Modal */}
      {initializeConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <RefreshCw className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold">Inicializar Configurações Padrão</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Deseja inicializar as configurações padrão do sistema?
                Configurações existentes não serão alteradas.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setInitializeConfirmModal(false)}
                  className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInitializeDefaultsConfirm}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Inicializar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
