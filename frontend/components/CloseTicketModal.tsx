/**
 * Close Ticket Modal - Formulário de fechamento com peças
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { partsApi } from '@/lib/api';

interface Part {
  id: string;
  name: string;
  code: string;
  quantity: number;
  unitCost: number;
}

interface SelectedPart {
  partId?: string;
  partName: string;
  quantity: number;
  unitCost: number;
  purchased: boolean;
}

interface CloseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    solution: string;
    solutionType: string;
    timeWorked: number;
    parts: SelectedPart[];
  }) => void;
}

const SOLUTION_TYPES = [
  'Hardware',
  'Software',
  'Rede',
  'Configuração',
  'Instalação',
  'Limpeza/Manutenção',
  'Orientação ao Usuário',
  'Outro',
];

export default function CloseTicketModal({
  isOpen,
  onClose,
  onSubmit,
}: CloseTicketModalProps) {
  const [solution, setSolution] = useState('');
  const [solutionType, setSolutionType] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [parts, setParts] = useState<Part[]>([]);
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [showAddPart, setShowAddPart] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartCost, setNewPartCost] = useState(0);
  const [newPartQty, setNewPartQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadParts = useCallback(async () => {
    try {
      const response = await partsApi.list();
      setParts(response.data);
    } catch (error) {
      console.error('Erro ao carregar peças:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadParts();
    }
  }, [isOpen, loadParts]);

  function handleAddPartFromStock(part: Part) {
    const existing = selectedParts.find((p) => p.partId === part.id);
    if (existing) {
      setSelectedParts(
        selectedParts.map((p) =>
          p.partId === part.id ? { ...p, quantity: p.quantity + 1 } : p
        )
      );
    } else {
      setSelectedParts([
        ...selectedParts,
        {
          partId: part.id,
          partName: part.name,
          quantity: 1,
          unitCost: Number(part.unitCost),
          purchased: false,
        },
      ]);
    }
  }

  function handleAddPurchasedPart() {
    if (!newPartName.trim()) return;
    setSelectedParts([
      ...selectedParts,
      {
        partName: newPartName,
        quantity: newPartQty,
        unitCost: newPartCost,
        purchased: true,
      },
    ]);
    setNewPartName('');
    setNewPartCost(0);
    setNewPartQty(1);
    setShowAddPart(false);
  }

  function handleRemovePart(index: number) {
    setSelectedParts(selectedParts.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!solution.trim()) {
      alert('Por favor, descreva a solução aplicada');
      return;
    }

    setLoading(true);
    const timeWorked = hours * 60 + minutes;

    onSubmit({
      solution,
      solutionType,
      timeWorked,
      parts: selectedParts,
    });
  }

  const totalCost = selectedParts.reduce(
    (sum, p) => sum + p.quantity * p.unitCost,
    0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            ✅ Fechar Chamado
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Preencha os detalhes da solução aplicada
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Solução */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              📝 Solução Aplicada *
            </label>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="Descreva o que foi feito para resolver o problema..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px]"
            />
          </div>

          {/* Tipo de Solução */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              🏷️ Categoria da Solução
            </label>
            <select
              value={solutionType}
              onChange={(e) => setSolutionType(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Selecione...</option>
              {SOLUTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Tempo Trabalhado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ⏱️ Tempo Trabalhado
            </label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                />
                <span className="text-gray-600 dark:text-gray-400">horas</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                />
                <span className="text-gray-600 dark:text-gray-400">minutos</span>
              </div>
            </div>
          </div>

          {/* Peças Utilizadas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              🔧 Peças Utilizadas
            </label>

            {/* Peças Selecionadas */}
            {selectedParts.length > 0 && (
              <div className="mb-4 space-y-2">
                {selectedParts.map((part, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2"
                  >
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {part.quantity}x {part.partName}
                      </span>
                      {part.purchased && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                          Comprada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        R$ {(part.quantity * part.unitCost).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemovePart(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div className="text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total: R$ {totalCost.toFixed(2)}
                </div>
              </div>
            )}

            {/* Adicionar do Estoque */}
            <div className="flex flex-wrap gap-2 mb-3">
              {parts.filter(p => p.quantity > 0).slice(0, 8).map((part) => (
                <button
                  key={part.id}
                  onClick={() => handleAddPartFromStock(part)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm transition"
                >
                  + {part.name} ({part.quantity})
                </button>
              ))}
            </div>

            {/* Adicionar Peça Comprada */}
            {!showAddPart ? (
              <button
                onClick={() => setShowAddPart(true)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Adicionar peça comprada
              </button>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                <input
                  type="text"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  placeholder="Nome da peça"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                />
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={newPartQty}
                    onChange={(e) => setNewPartQty(parseInt(e.target.value) || 1)}
                    min="1"
                    placeholder="Qtd"
                    className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                  />
                  <input
                    type="number"
                    value={newPartCost}
                    onChange={(e) => setNewPartCost(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    placeholder="Custo unitário"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddPurchasedPart}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => setShowAddPart(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !solution.trim()}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition"
          >
            {loading ? 'Fechando...' : '✅ Fechar Chamado'}
          </button>
        </div>
      </div>
    </div>
  );
}
