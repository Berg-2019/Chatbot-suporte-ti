/**
 * Admin FAQ Page - Gerenciamento da Base de Conhecimento
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { faqApi } from '@/lib/api';
import Link from 'next/link';

interface Faq {
  id: string;
  question: string;
  answer: string;
  keywords: string;
  category?: string;
  views: number;
  helpful: number;
  active: boolean;
}

export default function FaqPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    keywords: '',
    category: '',
  });
  const [saving, setSaving] = useState(false);

  const loadFaqs = useCallback(async () => {
    try {
      const response = await faqApi.list();
      setFaqs(response.data);
    } catch (error) {
      console.error('Erro ao carregar FAQs:', error);
    } finally {
      setLoadingFaqs(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      loadFaqs();
    }
  }, [user, loading, router, loadFaqs]);

  function openNewModal() {
    setEditingFaq(null);
    setFormData({
      question: '',
      answer: '',
      keywords: '',
      category: '',
    });
    setShowModal(true);
  }

  function openEditModal(faq: Faq) {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      keywords: faq.keywords,
      category: faq.category || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.question || !formData.answer || !formData.keywords) {
      alert('Pergunta, resposta e palavras-chave são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      if (editingFaq) {
        await faqApi.update(editingFaq.id, formData);
      } else {
        await faqApi.create(formData);
      }
      setShowModal(false);
      loadFaqs();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar FAQ');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja desativar esta FAQ?')) return;
    try {
      await faqApi.delete(id);
      loadFaqs();
    } catch (error) {
      console.error('Erro ao desativar:', error);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const totalViews = faqs.reduce((sum, f) => sum + f.views, 0);
  const totalHelpful = faqs.reduce((sum, f) => sum + f.helpful, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              ← Voltar
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              📚 Base de Conhecimento
            </h1>
          </div>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            + Nova Pergunta
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{faqs.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Perguntas</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <p className="text-3xl font-bold text-blue-600">{totalViews}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Visualizações</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <p className="text-3xl font-bold text-green-600">{totalHelpful}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Úteis</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <p className="text-3xl font-bold text-purple-600">
              {totalViews > 0 ? Math.round((totalHelpful / totalViews) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Taxa de Sucesso</p>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {loadingFaqs ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma FAQ cadastrada. Clique em &quot;+ Nova Pergunta&quot; para começar.
            </div>
          ) : (
            faqs.map((faq) => (
              <div
                key={faq.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow p-6 ${!faq.active ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">
                      {faq.answer}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {faq.keywords.split(',').map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm"
                        >
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>👁️ {faq.views}</span>
                      <span>👍 {faq.helpful}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(faq)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(faq.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Desativar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingFaq ? 'Editar Pergunta' : 'Nova Pergunta'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pergunta *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Como resetar minha senha?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Resposta *
                </label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Explique a solução de forma clara..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Palavras-chave * (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: senha, resetar, esqueci, login"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ex: Acesso, Rede, Impressora"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
