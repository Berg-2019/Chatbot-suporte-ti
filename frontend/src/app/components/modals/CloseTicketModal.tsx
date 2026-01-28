import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Box, DollarSign, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface CloseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CloseTicketData) => void;
  ticketId: string | number;
}

export interface CloseTicketData {
  solution: string;
  category: string;
  timeSpent: string;
  parts: Array<{ id: number; name: string; quantity: number; cost: number }>;
  saveContact: boolean;
  totalCost: number;
}

// Dados mockados de estoque
const STOCK_ITEMS = [
  { id: 1, name: 'Cabo de Rede 3m', cost: 15.00, stock: 45 },
  { id: 2, name: 'Mouse Óptico USB', cost: 35.00, stock: 12 },
  { id: 3, name: 'Teclado Padrão ABNT2', cost: 65.00, stock: 8 },
  { id: 4, name: 'Conector RJ45 (unid)', cost: 1.50, stock: 200 },
  { id: 5, name: 'SSD 240GB', cost: 180.00, stock: 5 },
  { id: 6, name: 'Fonte ATX 500W', cost: 120.00, stock: 3 },
  { id: 7, name: 'Cabo HDMI 2m', cost: 25.00, stock: 15 },
  { id: 8, name: 'Adaptador Wi-Fi USB', cost: 55.00, stock: 10 },
];

export default function CloseTicketModal({ isOpen, onClose, onConfirm, ticketId }: CloseTicketModalProps) {
  const [solution, setSolution] = useState('');
  const [category, setCategory] = useState('software');
  const [timeHours, setTimeHours] = useState('0');
  const [timeMinutes, setTimeMinutes] = useState('0');
  const [parts, setParts] = useState<Array<{ id: number; name: string; quantity: number; cost: number }>>([]);
  const [saveContact, setSaveContact] = useState(false);
  const [showPartForm, setShowPartForm] = useState(false);
  
  // Custom part form
  const [customPartName, setCustomPartName] = useState('');
  const [customPartCost, setCustomPartCost] = useState('');
  const [customPartQty, setCustomPartQty] = useState('1');

  if (!isOpen) return null;

  const handleAddStockPart = (item: typeof STOCK_ITEMS[0]) => {
    const existing = parts.find(p => p.id === item.id);
    if (existing) {
      setParts(parts.map(p => p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setParts([...parts, { id: item.id, name: item.name, quantity: 1, cost: item.cost }]);
    }
  };

  const handleAddCustomPart = () => {
    if (!customPartName || !customPartCost) return;
    const newPart = {
      id: Date.now(), // ID temporário
      name: customPartName,
      cost: parseFloat(customPartCost),
      quantity: parseInt(customPartQty) || 1
    };
    setParts([...parts, newPart]);
    setCustomPartName('');
    setCustomPartCost('');
    setCustomPartQty('1');
    setShowPartForm(false);
  };

  const removePart = (id: number) => {
    setParts(parts.filter(p => p.id !== id));
  };

  const totalCost = parts.reduce((acc, curr) => acc + (curr.cost * curr.quantity), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!solution.trim()) {
      toast.error('Descreva a solução aplicada');
      return;
    }

    onConfirm({
      solution,
      category,
      timeSpent: `${timeHours}h ${timeMinutes}m`,
      parts,
      saveContact,
      totalCost
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Save size={20} className="text-green-500" />
              Finalizar Atendimento
            </h2>
            <p className="text-sm text-slate-400">Ticket #{ticketId}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Solução */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">Solução Aplicada <span className="text-red-500">*</span></label>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none min-h-[100px]"
              placeholder="Descreva detalhadamente o que foi feito..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Categoria */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="software">Software / Sistema</option>
                <option value="hardware">Hardware / Peças</option>
                <option value="rede">Rede / Conectividade</option>
                <option value="usuario">Treinamento / Dúvida</option>
                <option value="impressora">Impressoras</option>
              </select>
            </div>

            {/* Tempo */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Clock size={16} /> Tempo Trabalhado
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    value={timeHours}
                    onChange={(e) => setTimeHours(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pr-8 text-white focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">h</span>
                </div>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pr-8 text-white focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Peças e Materiais */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Box size={16} /> Peças e Materiais
              </h3>
              <div className="text-sm text-green-400 font-bold">
                Total: R$ {totalCost.toFixed(2)}
              </div>
            </div>

            {/* Estoque Rápido */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STOCK_ITEMS.slice(0, 4).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAddStockPart(item)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded p-2 text-xs text-left transition-colors truncate"
                  title={`${item.name} - R$ ${item.cost}`}
                >
                  <div className="font-medium text-slate-200 truncate">{item.name}</div>
                  <div className="text-slate-500">R$ {item.cost.toFixed(2)}</div>
                </button>
              ))}
            </div>

            {/* Lista de Peças Selecionadas */}
            {parts.length > 0 && (
              <div className="bg-slate-950/50 rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="p-2 pl-3">Item</th>
                      <th className="p-2 text-center">Qtd</th>
                      <th className="p-2 text-right">Subtotal</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {parts.map(part => (
                      <tr key={part.id}>
                        <td className="p-2 pl-3 text-slate-300">{part.name}</td>
                        <td className="p-2 text-center text-slate-400">{part.quantity}</td>
                        <td className="p-2 text-right text-slate-300">R$ {(part.cost * part.quantity).toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <button onClick={() => removePart(part.id)} className="text-red-500 hover:text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Botão Adicionar Manual */}
            {!showPartForm ? (
              <button
                type="button"
                onClick={() => setShowPartForm(true)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar item não listado / compra avulsa
              </button>
            ) : (
              <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700 grid grid-cols-12 gap-2 items-end">
                <div className="col-span-6">
                  <label className="text-xs text-slate-500 block mb-1">Nome do Item</label>
                  <input 
                    type="text" 
                    value={customPartName}
                    onChange={e => setCustomPartName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm text-white" 
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">Qtd</label>
                  <input 
                    type="number" 
                    value={customPartQty}
                    onChange={e => setCustomPartQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm text-white" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-slate-500 block mb-1">Custo Un.</label>
                  <input 
                    type="number" 
                    value={customPartCost}
                    onChange={e => setCustomPartCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm text-white" 
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-1">
                  <button onClick={handleAddCustomPart} className="w-full h-[34px] bg-blue-600 hover:bg-blue-500 rounded flex items-center justify-center text-white">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* CRM */}
          <div className="pt-4 border-t border-slate-800">
            <label className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
              <input 
                type="checkbox" 
                checked={saveContact}
                onChange={(e) => setSaveContact(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 text-green-600 focus:ring-green-500 bg-slate-950"
              />
              <div className="text-sm">
                <span className="text-slate-200 font-medium">Salvar Contato no CRM</span>
                <p className="text-slate-500 text-xs">Atualizar dados do cliente para futuros atendimentos</p>
              </div>
            </label>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-800/30 rounded-b-2xl flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg shadow-lg shadow-green-900/20 flex items-center gap-2 transition-all hover:scale-105"
          >
            <Save size={18} />
            Confirmar e Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
