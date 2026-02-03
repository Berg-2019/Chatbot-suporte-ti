import { HelpCircle, Plus, Edit2, Trash2, Search, Loader2, X, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { faqApi, type FAQ } from '@/app/services/api';

export default function FAQView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    keywords: '',
    category: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await faqApi.getAll();
      setFaqs(data);
    } catch (err) {
      console.error('Failed to fetch FAQs:', err);
      setError('Erro ao carregar FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (faq?: FAQ) => {
    if (faq) {
      setEditingFaq(faq);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords,
        category: faq.category || '',
      });
    } else {
      setEditingFaq(null);
      setFormData({ question: '', answer: '', keywords: '', category: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFaq(null);
    setFormData({ question: '', answer: '', keywords: '', category: '' });
  };

  const handleSave = async () => {
    if (!formData.question || !formData.answer || !formData.keywords) {
      return;
    }

    try {
      setSaving(true);
      if (editingFaq) {
        await faqApi.update(editingFaq.id, formData);
      } else {
        await faqApi.create(formData);
      }
      handleCloseModal();
      fetchFaqs();
    } catch (err) {
      console.error('Failed to save FAQ:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) return;

    try {
      await faqApi.delete(id);
      fetchFaqs();
    } catch (err) {
      console.error('Failed to delete FAQ:', err);
    }
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = !searchTerm ||
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (faq.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(faqs.map(faq => faq.category).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">FAQ - Perguntas Frequentes</h1>
          <p className="text-slate-400">Gerencie as perguntas e respostas mais comuns</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Adicionar FAQ</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar perguntas, respostas ou categorias..."
            className="w-full bg-slate-800 text-white rounded-lg pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${!selectedCategory
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
        >
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === category
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
          >
            {category}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
          <button onClick={fetchFaqs} className="ml-4 underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* FAQ List */}
      <div className="space-y-4">
        {filteredFaqs.map((faq) => (
          <div
            key={faq.id}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 hover:border-slate-700/50 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <HelpCircle className="text-blue-500" size={20} />
                  <h3 className="text-white font-semibold text-lg">{faq.question}</h3>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {faq.category && (
                    <span className="text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full">
                      {faq.category}
                    </span>
                  )}
                  <span className="text-slate-400">{faq.views} visualizações</span>
                  <span className="text-green-400">{faq.helpful} úteis</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(faq)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Edit2 className="text-slate-400" size={18} />
                </button>
                <button
                  onClick={() => handleDelete(faq.id)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 className="text-red-400" size={18} />
                </button>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
              <p className="text-slate-300 whitespace-pre-line">{faq.answer}</p>
            </div>

            {faq.keywords && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {faq.keywords.split(',').map((keyword, i) => (
                  <span key={i} className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                    {keyword.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredFaqs.length === 0 && !loading && (
        <div className="text-center py-12">
          <HelpCircle className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">Nenhuma pergunta encontrada</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingFaq ? 'Editar FAQ' : 'Nova FAQ'}
              </h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">Pergunta *</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Como faço para..."
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">Resposta *</label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={5}
                  className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Para resolver isso, você deve..."
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">Palavras-chave * (separadas por vírgula)</label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="senha, reset, acesso"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">Categoria</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Hardware, Software, Rede..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.question || !formData.answer || !formData.keywords}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
