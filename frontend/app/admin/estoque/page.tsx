/**
 * Admin Estoque Page - Gerenciamento de Peças
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { partsApi } from '@/lib/api';
import Link from 'next/link';

interface Part {
  id: string;
  name: string;
  code: string;
  description?: string;
  quantity: number;
  minQuantity: number;
  unitCost: number;
  active: boolean;
  _count?: { usages: number };
}

export default function EstoquePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [loadingParts, setLoadingParts] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    quantity: 0,
    minQuantity: 5,
    unitCost: 0,
  });
  const [saving, setSaving] = useState(false);

  const loadParts = useCallback(async () => {
    try {
      const response = await partsApi.list();
      setParts(response.data);
    } catch (error) {
      console.error('Erro ao carregar peças:', error);
    } finally {
      setLoadingParts(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      loadParts();
    }
  }, [user, loading, router, loadParts]);

  function openNewModal() {
    setEditingPart(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      quantity: 0,
      minQuantity: 5,
      unitCost: 0,
    });
    setShowModal(true);
  }

  function openEditModal(part: Part) {
    setEditingPart(part);
    setFormData({
      name: part.name,
      code: part.code,
      description: part.description || '',
      quantity: part.quantity,
      minQuantity: part.minQuantity,
      unitCost: Number(part.unitCost),
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.code) {
      alert('Nome e código são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      if (editingPart) {
        await partsApi.update(editingPart.id, formData);
      } else {
        await partsApi.create(formData);
      }
      setShowModal(false);
      loadParts();
    } catch (error: unknown) {
      console.error('Erro ao salvar:', error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Erro ao salvar peça');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddStock(part: Part) {
    const qty = prompt(`Adicionar estoque para ${part.name}:\nQuantidade atual: ${part.quantity}`);
    if (!qty || isNaN(parseInt(qty))) return;

    try {
      await partsApi.addStock(part.id, parseInt(qty));
      loadParts();
    } catch (error) {
      console.error('Erro ao adicionar estoque:', error);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const lowStockParts = parts.filter(p => p.quantity <= p.minQuantity && p.active);
  const totalValue = parts.reduce((sum, p) => sum + p.quantity * Number(p.unitCost), 0);

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
              📦 Estoque de Peças
            </h1>
          </div>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            + Nova Peça
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{parts.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total de Peças</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {parts.reduce((sum, p) => sum + p.quantity, 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Itens em Estoque</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <p className="text-3xl font-bold text-red-600">{lowStockParts.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Estoque Baixo</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <p className="text-3xl font-bold text-green-600">R$ {totalValue.toFixed(2)}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockParts.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2">
              ⚠️ Alerta de Estoque Baixo
            </h3>
            <div className="flex flex-wrap gap-2">
              {lowStockParts.map(p => (
                <span key={p.id} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                  {p.name}: {p.quantity} unid.
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Parts Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Quantidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Custo Unit.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Valor Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loadingParts ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : parts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma peça cadastrada
                  </td>
                </tr>
              ) : (
                parts.map((part) => (
                  <tr key={part.id} className={!part.active ? 'opacity-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {part.code}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {part.name}
                      </div>
                      {part.description && (
                        <div className="text-sm text-gray-500">{part.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        part.quantity <= part.minQuantity ? 'text-red-600' : 'text-gray-900 dark:text-white'
                      }`}>
                        {part.quantity}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        (mín: {part.minQuantity})
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      R$ {Number(part.unitCost).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      R$ {(part.quantity * Number(part.unitCost)).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleAddStock(part)}
                        className="text-green-600 hover:text-green-700 mr-3"
                      >
                        + Estoque
                      </button>
                      <button
                        onClick={() => openEditModal(part)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingPart ? 'Editar Peça' : 'Nova Peça'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="SKU ou código interno"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Nome da peça"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Descrição opcional"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mín. Alerta
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custo (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
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
