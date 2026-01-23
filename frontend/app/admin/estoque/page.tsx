/**
 * Admin Estoque Page - Gerenciamento de Peças e Compras
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { partsApi, purchasesApi, suppliersApi, EquipmentCategory } from '@/lib/api';
import Link from 'next/link';

// ============ TYPES ============

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

interface Purchase {
  id: string;
  name: string;
  category: EquipmentCategory;
  serialNumber?: string;
  assetTag?: string;
  quantity: number;
  unitPrice: number;
  supplierId?: string;
  supplier?: { id: string; name: string };
  supplierName?: string;
  sector: string;
  location?: string;
  responsibleName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  warrantyMonths?: number;
  purchaseDate: string;
  notes?: string;
}

interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  _count?: { purchases: number };
}

interface MonthlyReport {
  period: { year: number; month: number };
  summary: { totalPurchases: number; totalItems: number; totalValue: number; averagePerItem: number };
  byCategory: Array<{ category: string; count: number; total: number }>;
  bySector: Array<{ sector: string; count: number; total: number }>;
  purchases: Array<{ id: string; name: string; category: string; sector: string; quantity: number; unitPrice: number; totalPrice: number; purchaseDate: string; supplier?: string }>;
}

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  COMPUTER: '💻 Computador',
  PRINTER: '🖨️ Impressora',
  MONITOR: '🖥️ Monitor',
  PERIPHERAL: '🖱️ Periférico',
  NETWORK: '🌐 Rede',
  SOFTWARE: '📀 Software',
  OTHER: '📦 Outros',
};

const CATEGORY_COLORS: Record<EquipmentCategory, string> = {
  COMPUTER: 'bg-blue-100 text-blue-800',
  PRINTER: 'bg-green-100 text-green-800',
  MONITOR: 'bg-purple-100 text-purple-800',
  PERIPHERAL: 'bg-yellow-100 text-yellow-800',
  NETWORK: 'bg-cyan-100 text-cyan-800',
  SOFTWARE: 'bg-pink-100 text-pink-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

// ============ MAIN COMPONENT ============

export default function EstoquePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'parts' | 'purchases' | 'reports'>('parts');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

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
              📦 Estoque e Compras
            </h1>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('parts')}
            className={`px-4 py-2 rounded-md font-medium transition ${activeTab === 'parts'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            🔧 Peças
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-4 py-2 rounded-md font-medium transition ${activeTab === 'purchases'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            🛒 Compras
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-md font-medium transition ${activeTab === 'reports'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            📊 Relatórios
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'parts' && <PartsTab />}
        {activeTab === 'purchases' && <PurchasesTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </main>
    </div>
  );
}

// ============ PARTS TAB ============

function PartsTab() {
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
    loadParts();
  }, [loadParts]);

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

  const lowStockParts = parts.filter(p => p.quantity <= p.minQuantity && p.active);
  const totalValue = parts.reduce((sum, p) => sum + p.quantity * Number(p.unitCost), 0);

  return (
    <>
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

      {/* Actions */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openNewModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          + Nova Peça
        </button>
      </div>

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
                    <span className={`text-sm font-medium ${part.quantity <= part.minQuantity ? 'text-red-600' : 'text-gray-900 dark:text-white'
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
    </>
  );
}

// ============ PURCHASES TAB ============

function PurchasesTab() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'OTHER' as EquipmentCategory,
    serialNumber: '',
    assetTag: '',
    quantity: 1,
    unitPrice: 0,
    supplierId: '',
    supplierName: '',
    sector: '',
    location: '',
    responsibleName: '',
    invoiceNumber: '',
    invoiceDate: '',
    warrantyMonths: 12,
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [purchasesRes, suppliersRes] = await Promise.all([
        purchasesApi.list(),
        suppliersApi.list(),
      ]);
      setPurchases(purchasesRes.data);
      setSuppliers(suppliersRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openNewModal() {
    setFormData({
      name: '',
      category: 'OTHER',
      serialNumber: '',
      assetTag: '',
      quantity: 1,
      unitPrice: 0,
      supplierId: '',
      supplierName: '',
      sector: '',
      location: '',
      responsibleName: '',
      invoiceNumber: '',
      invoiceDate: '',
      warrantyMonths: 12,
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.sector || !formData.unitPrice) {
      alert('Nome, setor e valor são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      await purchasesApi.create({
        ...formData,
        supplierId: formData.supplierId || undefined,
        invoiceDate: formData.invoiceDate || undefined,
      });
      setShowModal(false);
      loadData();
    } catch (error: unknown) {
      console.error('Erro ao salvar:', error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Erro ao registrar compra');
    } finally {
      setSaving(false);
    }
  }

  const monthlyTotal = purchases
    .filter(p => {
      const date = new Date(p.purchaseDate);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + Number(p.unitPrice) * p.quantity, 0);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{purchases.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total de Compras</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <p className="text-3xl font-bold text-green-600">R$ {monthlyTotal.toFixed(2)}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total do Mês</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{suppliers.length}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Fornecedores</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <p className="text-3xl font-bold text-blue-600">
            {purchases.reduce((sum, p) => sum + p.quantity, 0)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Itens Comprados</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end mb-4">
        <button
          onClick={openNewModal}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
        >
          + Nova Compra
        </button>
      </div>

      {/* Purchases Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Equipamento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Categoria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Setor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Qtd
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Valor Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Carregando...
                </td>
              </tr>
            ) : purchases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Nenhuma compra registrada
                </td>
              </tr>
            ) : (
              purchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(purchase.purchaseDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {purchase.name}
                    </div>
                    {purchase.supplier && (
                      <div className="text-xs text-gray-500">
                        {purchase.supplier.name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[purchase.category]}`}>
                      {CATEGORY_LABELS[purchase.category]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {purchase.sector}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {purchase.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    R$ {(Number(purchase.unitPrice) * purchase.quantity).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nova Compra */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl my-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                🛒 Registrar Nova Compra
              </h2>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Equipamento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Equipamento *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Impressora HP LaserJet Pro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as EquipmentCategory })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantidade e Valor */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor Unitário (R$) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor Total
                  </label>
                  <div className="px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold">
                    R$ {(formData.quantity * formData.unitPrice).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Setor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Setor Destino *
                  </label>
                  <input
                    type="text"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Engenharia"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Local Específico
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: Sala 201"
                  />
                </div>
              </div>

              {/* Fornecedor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fornecedor Cadastrado
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value, supplierName: '' })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Selecione ou digite abaixo</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ou Nome do Fornecedor
                  </label>
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value, supplierId: '' })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Digite o nome"
                    disabled={!!formData.supplierId}
                  />
                </div>
              </div>

              {/* Identificação */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nº de Série
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Patrimônio
                  </label>
                  <input
                    type="text"
                    value={formData.assetTag}
                    onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Documento Fiscal */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nº Nota Fiscal
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data da Compra
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Garantia (meses)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.warrantyMonths}
                    onChange={(e) => setFormData({ ...formData, warrantyMonths: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Responsável e Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Responsável pelo Recebimento
                </label>
                <input
                  type="text"
                  value={formData.responsibleName}
                  onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg"
              >
                {saving ? 'Salvando...' : 'Registrar Compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============ REPORTS TAB ============

function ReportsTab() {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await purchasesApi.monthlyReport(year, month);
      setReport(response.data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <>
      {/* Period Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📊 Relatório Mensal de Compras
        </h3>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mês
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ano
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg"
          >
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : report ? (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{report.summary.totalPurchases}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Compras Realizadas</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <p className="text-3xl font-bold text-blue-600">{report.summary.totalItems}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Itens Comprados</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <p className="text-3xl font-bold text-green-600">R$ {report.summary.totalValue.toFixed(2)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Valor Total</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <p className="text-3xl font-bold text-purple-600">R$ {report.summary.averagePerItem.toFixed(2)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Média por Item</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* By Category */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Por Categoria
              </h4>
              {report.byCategory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-3">
                  {report.byCategory.map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${CATEGORY_COLORS[item.category as EquipmentCategory] || 'bg-gray-100 text-gray-800'}`}>
                          {CATEGORY_LABELS[item.category as EquipmentCategory] || item.category}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {item.count} itens
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        R$ {item.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* By Sector */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Por Setor
              </h4>
              {report.bySector.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-3">
                  {report.bySector.map((item) => (
                    <div key={item.sector} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-900 dark:text-white">
                          {item.sector}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {item.count} itens
                        </span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        R$ {item.total.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Purchases List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Detalhamento das Compras
              </h4>
            </div>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Equipamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Setor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Qtd</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {report.purchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma compra neste período
                    </td>
                  </tr>
                ) : (
                  report.purchases.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {new Date(p.purchaseDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</div>
                        {p.supplier && <div className="text-xs text-gray-500">{p.supplier}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[p.category as EquipmentCategory] || 'bg-gray-100 text-gray-800'}`}>
                          {CATEGORY_LABELS[p.category as EquipmentCategory] || p.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{p.sector}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{p.quantity}</td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600">R$ {p.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Selecione um período para ver o relatório
        </div>
      )}
    </>
  );
}
