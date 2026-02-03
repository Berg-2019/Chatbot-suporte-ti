import { useState, useEffect } from 'react';
import { X, Save, Package } from 'lucide-react';
import { toast } from 'sonner';
import { type StockItem } from '@/app/services/api';

interface StockFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: Partial<StockItem>) => void;
    initialData?: StockItem | null;
    defaultType?: 'TI' | 'ELECTRIC';
}

export default function StockFormModal({ isOpen, onClose, onConfirm, initialData, defaultType = 'TI' }: StockFormModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        category: 'SUPPLY',
        stockType: defaultType,
        quantity: '0',
        minQuantity: '5',
        unit: 'UN',
        location: '',
        printerModel: '',
        inkColor: 'BLACK',
        assetTag: '',
        isReservable: false,
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                code: initialData.code || '',
                category: initialData.category,
                stockType: initialData.stockType,
                quantity: String(initialData.quantity),
                minQuantity: String(initialData.minQuantity),
                unit: initialData.unit,
                location: initialData.location || '',
                printerModel: initialData.printerModel || '',
                inkColor: initialData.inkColor || 'BLACK',
                assetTag: initialData.assetTag || '',
                isReservable: initialData.isReservable || false,
            });
        } else {
            setFormData({
                name: '',
                code: '',
                category: 'SUPPLY',
                stockType: defaultType,
                quantity: '0',
                minQuantity: '5',
                unit: 'UN',
                location: '',
                printerModel: '',
                inkColor: 'BLACK',
                assetTag: '',
                isReservable: false,
            });
        }
    }, [initialData, isOpen, defaultType]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error('Nome é obrigatório');
            return;
        }

        // Prepare data based on category
        // Prepare data based on category
        const data: any = {
            name: formData.name,
            code: formData.code,
            quantity: Number(formData.quantity),
            minQuantity: Number(formData.minQuantity),
            location: formData.location,
        };

        // Fields only allowed on creation
        if (!initialData) {
            data.category = formData.category;
            data.stockType = formData.stockType;
            data.unit = formData.unit;
        }

        if (formData.category === 'INK') {
            data.printerModel = formData.printerModel;
            data.inkColor = formData.inkColor;
        } else if (formData.category === 'ASSET') {
            data.assetTag = formData.assetTag;
            data.isReservable = formData.isReservable;
        }

        onConfirm(data);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Package size={20} className="text-blue-500" />
                            {initialData ? 'Editar Item' : 'Novo Item'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="stock-form" onSubmit={handleSubmit} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Categoria */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Categoria</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => {
                                        const newCategory = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            category: newCategory,
                                            // Se for patrimônio, força unidade UN, qtd 1 e min 0
                                            ...(newCategory === 'ASSET' ? {
                                                unit: 'UN',
                                                quantity: '1',
                                                minQuantity: '0'
                                            } : {})
                                        }));
                                    }}
                                    disabled={!!initialData}
                                    className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none ${initialData ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <option value="SUPPLY">Insumo / Peça</option>
                                    <option value="INK">Tinta / Toner</option>
                                    <option value="ASSET">Patrimônio / Equipamento</option>
                                </select>
                            </div>

                            {/* Tipo de Estoque */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Tipo de Estoque</label>
                                <select
                                    value={formData.stockType}
                                    onChange={(e) => setFormData({ ...formData, stockType: e.target.value })}
                                    disabled={!!initialData}
                                    className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none ${initialData ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <option value="TI">TI</option>
                                    <option value="ELECTRIC">Elétrica</option>
                                </select>
                            </div>
                        </div>

                        {/* Campos Básicos */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Nome do Item</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ex: Teclado USB, Toner HP 105A..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Código / SKU</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Localização</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ex: Armário 1"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Unidade</label>
                                <select
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    disabled={!!initialData || formData.category === 'ASSET'}
                                    className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none ${initialData || formData.category === 'ASSET' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <option value="UN">Unidade</option>
                                    <option value="CX">Caixa</option>
                                    <option value="PCT">Pacote</option>
                                    <option value="M">Metro</option>
                                    <option value="KG">Kg</option>
                                    <option value="L">Litros</option>
                                    <option value="ML">Mililitros</option>
                                </select>
                            </div>
                        </div>

                        {/* Quantidades (Apenas para não-patrimônio) */}
                        {formData.category !== 'ASSET' && (
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Quantidade Atual</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-300">Qtd. Mínima (Alerta)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.minQuantity}
                                        onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Campos Específicos: Tintas */}
                        {formData.category === 'INK' && (
                            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-4">
                                <h3 className="text-sm font-medium text-slate-400">Detalhes da Tinta</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Modelo da Impressora</label>
                                        <input
                                            type="text"
                                            value={formData.printerModel}
                                            onChange={(e) => setFormData({ ...formData, printerModel: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">Cor</label>
                                        <select
                                            value={formData.inkColor}
                                            onChange={(e) => setFormData({ ...formData, inkColor: e.target.value })}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="BLACK">Preto</option>
                                            <option value="CYAN">Ciano</option>
                                            <option value="MAGENTA">Magenta</option>
                                            <option value="YELLOW">Amarelo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Campos Específicos: Patrimônio */}
                        {formData.category === 'ASSET' && (
                            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium text-slate-400">Detalhes do Patrimônio</h3>
                                    <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                                        Item Único
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={formData.assetTag}
                                        onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ex: PAT-00123"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.isReservable}
                                            onChange={(e) => setFormData({ ...formData, isReservable: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        <span className="ml-3 text-sm font-medium text-slate-300">Disponível para Reserva?</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-800/30 rounded-b-2xl flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="stock-form"
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all hover:scale-105"
                    >
                        <Save size={18} />
                        Salvar Item
                    </button>
                </div>

            </div>
        </div>
    );
}
