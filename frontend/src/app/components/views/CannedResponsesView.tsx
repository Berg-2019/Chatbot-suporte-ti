import { MessageSquare, Plus, Edit2, Trash2, Search, Loader2, X, Save, Filter, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cannedResponsesApi, type CannedResponse } from '@/app/services/api';

export default function CannedResponsesView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterPublic, setFilterPublic] = useState<boolean | undefined>(undefined);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null);
  const [formData, setFormData] = useState({
    shortcode: '',
    title: '',
    content: '',
    category: '',
    isPublic: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchResponses();
    fetchCategories();
  }, []);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cannedResponsesApi.list();
      setResponses(data);
    } catch (err) {
      console.error('Failed to fetch canned responses:', err);
      setError('Erro ao carregar respostas prontas');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await cannedResponsesApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleOpenModal = (response?: CannedResponse) => {
    if (response) {
      setEditingResponse(response);
      setFormData({
        shortcode: response.shortcode,
        title: response.title,
        content: response.content,
        category: response.category || '',
        isPublic: response.isPublic,
      });
    } else {
      setEditingResponse(null);
      setFormData({ shortcode: '', title: '', content: '', category: '', isPublic: true });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingResponse(null);
    setFormData({ shortcode: '', title: '', content: '', category: '', isPublic: true });
  };

  const handleSave = async () => {
    if (!formData.shortcode || !formData.title || !formData.content) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSaving(true);
      if (editingResponse) {
        await cannedResponsesApi.update(editingResponse.id, formData);
      } else {
        await cannedResponsesApi.create(formData);
      }
      handleCloseModal();
      fetchResponses();
      fetchCategories();
    } catch (err: any) {
      console.error('Failed to save canned response:', err);
      alert(err.message || 'Erro ao salvar resposta pronta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta resposta pronta?')) return;

    try {
      await cannedResponsesApi.delete(id);
      fetchResponses();
      fetchCategories();
    } catch (err) {
      console.error('Failed to delete canned response:', err);
      alert('Erro ao excluir resposta pronta');
    }
  };

  const filteredResponses = responses.filter(response => {
    const matchesSearch = !searchTerm ||
      response.shortcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      response.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      response.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || response.category === selectedCategory;
    const matchesPublic = filterPublic === undefined || response.isPublic === filterPublic;

    return matchesSearch && matchesCategory && matchesPublic;
  });

  // Extract variables from content
  const getVariables = (content: string): string[] => {
    const matches = content.match(/{{([^}]+)}}/g);
    return matches ? matches.map(m => m.replace(/{{|}}/g, '')) : [];
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-7 h-7" />
              Respostas Prontas
            </h1>
            <p className="text-gray-600 mt-1">
              Gerencie respostas rápidas para agilizar o atendimento
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Resposta
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por atalho, título ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todas as categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Public Filter */}
          <select
            value={filterPublic === undefined ? '' : String(filterPublic)}
            onChange={(e) => setFilterPublic(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Públicas e Privadas</option>
            <option value="true">Apenas Públicas</option>
            <option value="false">Apenas Privadas</option>
          </select>
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
            onClick={fetchResponses}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">
            {searchTerm || selectedCategory || filterPublic !== undefined
              ? 'Nenhuma resposta encontrada com os filtros aplicados'
              : 'Nenhuma resposta pronta cadastrada'}
          </p>
          {!searchTerm && !selectedCategory && filterPublic === undefined && (
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 text-blue-600 hover:text-blue-700"
            >
              Criar primeira resposta
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredResponses.map(response => (
            <div
              key={response.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-sm font-mono">
                      {response.shortcode}
                    </code>
                    {!response.isPublic && (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                        Privada
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900">{response.title}</h3>
                  {response.category && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Tag className="w-3 h-3" />
                      {response.category}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenModal(response)}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(response.id)}
                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              {/* Content Preview */}
              <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                {response.content}
              </p>

              {/* Variables */}
              {getVariables(response.content).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {getVariables(response.content).map((variable, idx) => (
                    <span
                      key={idx}
                      className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-mono"
                    >
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingResponse ? 'Editar Resposta' : 'Nova Resposta'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Shortcode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Atalho <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.shortcode}
                  onChange={(e) => setFormData({ ...formData, shortcode: e.target.value.toLowerCase() })}
                  placeholder="/exemplo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use apenas letras minúsculas, números e hífens
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Título descritivo da resposta"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conteúdo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Olá {{contact_name}}, seu chamado {{ticket_id}} foi..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
                <div className="mt-2 text-xs text-gray-600">
                  <p className="font-medium mb-1">Variáveis disponíveis:</p>
                  <div className="flex flex-wrap gap-1">
                    {['contact_name', 'contact_phone', 'contact_sector', 'agent_name', 'ticket_id', 'ticket_priority', 'current_time', 'current_date'].map(v => (
                      <code key={v} className="bg-gray-100 px-1.5 py-0.5 rounded">{`{{${v}}}`}</code>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ex: Saudações, Resoluções, TI"
                  list="categories"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <datalist id="categories">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Is Public */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                  Resposta pública (todos os agentes podem usar)
                </label>
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
