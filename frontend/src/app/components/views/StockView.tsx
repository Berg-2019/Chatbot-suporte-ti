import {
  Package,
  Plus,
  Edit2,
  AlertTriangle,
  TrendingUp,
  Search,
  Droplet,
  Monitor,
  Trash2,
  MoreVertical,
  CheckCircle2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Printer,
  CalendarClock,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';
import { addDays, format, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MobileFloatingMenu from '@/app/components/MobileFloatingMenu';
import MobileTimeline from '@/app/components/MobileTimeline';
import { useBadges } from '@/app/hooks/useBadges';
import { stockApi, reservationApi, type StockItem, type Reservation, type StockStats } from '@/app/services/api';

import StockFormModal from '../modals/StockFormModal';

export default function StockView() {
  const [searchTerm, setSearchTerm] = useState('');
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'supplies' | 'ink' | 'assets' | 'timeline'>('assets');
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const badges = useBadges();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  // API Data States
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stats, setStats] = useState<StockStats>({ total: 0, lowStock: 0, assets: 0, supplies: 0 });
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Department Filter State
  const [selectedDept, setSelectedDept] = useState<'TI' | 'ELECTRIC' | 'ALL'>('ALL');

  // Initialize filter based on profile
  useEffect(() => {
    if (profile === 'tech_ti') setSelectedDept('TI');
    else if (profile === 'tech_elect') setSelectedDept('ELECTRIC');
    else setSelectedDept('ALL');
  }, [profile]);

  // Fetch Stock Data
  const fetchStockData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const stockType = selectedDept === 'ALL' ? undefined : selectedDept;

      const [stockResponse, stockStats] = await Promise.all([
        stockApi.getAll({ stockType: stockType as any, search: searchTerm || undefined }),
        stockApi.getStats(stockType),
      ]);

      // Handle paginated response
      const items = stockResponse.items || [];
      setStockItems(items);
      const defaultStats = { total: 0, lowStock: 0, assets: 0, supplies: 0 };
      setStats(stockStats || defaultStats);
    } catch (err) {
      console.error('Error fetching stock:', err);
      setError('Erro ao carregar estoque');
      toast.error('Erro ao carregar dados do estoque');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDept, searchTerm]);

  const handleSave = async (data: Partial<StockItem>) => {
    try {
      if (editingItem) {
        await stockApi.update(editingItem.id, data);
        toast.success('Item atualizado com sucesso');
      } else {
        await stockApi.create(data);
        toast.success('Item criado com sucesso');
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchStockData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar item');
      console.error(err);
    }
  };

  const openEdit = (item: StockItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Fetch Reservations for Timeline
  const fetchReservations = useCallback(async () => {
    try {
      const endOfWeek = addDays(currentWeekStart, 7);
      const stockType = selectedDept === 'ALL' ? undefined : selectedDept;
      const data = await reservationApi.getTimeline(currentWeekStart, endOfWeek, stockType);
      setReservations(data);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  }, [currentWeekStart, selectedDept]);

  // Initial load
  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  // Load reservations when timeline tab is active
  useEffect(() => {
    if (activeTab === 'timeline') {
      fetchReservations();
    }
  }, [activeTab, fetchReservations]);

  // Filtered items by category
  const supplyItems = stockItems.filter(item => item.category === 'SUPPLY');
  const inkItems = stockItems.filter(item => item.category === 'INK');
  const assetItems = stockItems.filter(item => item.category === 'ASSET');

  const getInkColorClass = (color: string | null) => {
    switch (color) {
      case 'CYAN': return 'bg-cyan-500';
      case 'MAGENTA': return 'bg-pink-500';
      case 'YELLOW': return 'bg-yellow-400';
      case 'BLACK': return 'bg-slate-950';
      default: return 'bg-slate-500';
    }
  };

  const handleDelete = async (id: string, type: string) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      try {
        await stockApi.delete(id);
        toast.success(`${type} excluído com sucesso.`);
        fetchStockData();
      } catch (err) {
        toast.error('Erro ao excluir item');
      }
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await reservationApi.approve(id);
      toast.success('Reserva aprovada!');
      fetchReservations();
    } catch (err) {
      toast.error('Erro ao aprovar reserva');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await reservationApi.reject(id);
      toast.error('Reserva rejeitada.');
      fetchReservations();
    } catch (err) {
      toast.error('Erro ao rejeitar reserva');
    }
  };

  // Timeline helpers
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getReservationsForDay = (assetId: string, day: Date) => {
    return reservations.filter(res => {
      if (res.stockItemId !== assetId) return false;
      const start = parseISO(res.startTime);
      const end = parseISO(res.endTime);
      return isSameDay(start, day) || isSameDay(end, day) || (start < day && end > day);
    });
  };

  // Mobile menu items
  const mobileMenuItems = [
    { id: 'assets', icon: Monitor, label: 'Patrimônio', badge: badges.stock },
    { id: 'supplies', icon: Boxes, label: 'Insumos', badge: 0 },
    ...(profile !== 'tech_elect' ? [{ id: 'ink', icon: Printer, label: 'Tintas', badge: 0 }] : []),
    { id: 'timeline', icon: CalendarClock, label: 'Cronograma', badge: 0 },
  ];

  // Transform reservations for MobileTimeline component
  const mobileTimelineReservations = reservations.map(res => ({
    id: parseInt(res.id) || Math.random(),
    assetId: parseInt(res.stockItemId) || 0,
    assetName: res.stockItem?.name || 'Item',
    userName: res.userName,
    startTime: parseISO(res.startTime),
    endTime: parseISO(res.endTime),
    status: res.status === 'APPROVED' || res.status === 'IN_USE' ? 'approved' as const : 'pending' as const,
  }));

  // Loading state
  if (isLoading && stockItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
            Gestão de Estoque
          </h1>
          <p className="text-slate-400">Controle de insumos e equipamentos</p>
        </div>

        {/* Department Filter for Admins */}
        {profile !== 'tech_ti' && profile !== 'tech_elect' && (
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setSelectedDept('ALL')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedDept === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedDept('TI')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedDept === 'TI' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              TI
            </button>
            <button
              onClick={() => setSelectedDept('ELECTRIC')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedDept === 'ELECTRIC' ? 'bg-yellow-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Elétrica
            </button>
          </div>
        )}

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => fetchStockData()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors flex-1 sm:flex-initial shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Plus size={20} />
            <span className="font-medium">Novo Item</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Navigation Tabs - DESKTOP ONLY */}
      <div className="hidden md:flex gap-2 pb-2 border-b border-slate-700 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${activeTab === 'assets' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
        >
          <Monitor size={18} /> Patrimônio ({assetItems.length})
        </button>
        <button
          onClick={() => setActiveTab('supplies')}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${activeTab === 'supplies' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
        >
          <Package size={18} /> Insumos ({supplyItems.length})
        </button>
        {profile !== 'tech_elect' && (
          <button
            onClick={() => setActiveTab('ink')}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${activeTab === 'ink' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
          >
            <Droplet size={18} /> Tintas e Toners ({inkItems.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${activeTab === 'timeline' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
        >
          <CalendarDays size={18} /> Cronograma
        </button>
      </div>

      {/* Tab Content: Insumos (Supplies) */}
      {activeTab === 'supplies' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Package className="text-blue-500" size={24} />
                <div className="text-slate-400 text-sm">Total Insumos</div>
              </div>
              <div className="text-3xl font-bold text-white">{stats.supplies}</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-green-500" size={24} />
                <div className="text-slate-400 text-sm">Total Itens</div>
              </div>
              <div className="text-3xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="text-yellow-500" size={24} />
                <div className="text-slate-400 text-sm">Estoque Baixo</div>
              </div>
              <div className="text-3xl font-bold text-yellow-500">{stats.lowStock}</div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar insumos..."
                className="w-full bg-slate-800 text-white rounded-lg pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700/50">
                  <tr>
                    <th className="text-left p-4 text-slate-400 font-medium text-sm">Item</th>
                    <th className="text-left p-4 text-slate-400 font-medium text-sm hidden md:table-cell">Código</th>
                    <th className="text-left p-4 text-slate-400 font-medium text-sm">Qtd.</th>
                    <th className="text-left p-4 text-slate-400 font-medium text-sm hidden sm:table-cell">Local</th>
                    <th className="text-left p-4 text-slate-400 font-medium text-sm">Status</th>
                    <th className="text-right p-4 text-slate-400 font-medium text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {supplyItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Nenhum insumo encontrado
                      </td>
                    </tr>
                  ) : supplyItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                      <td className="p-4">
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-xs text-slate-500 md:hidden">{item.code}</div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <span className="bg-slate-700 px-2 py-1 rounded text-xs text-slate-300">{item.code || '-'}</span>
                      </td>
                      <td className="p-4 font-bold text-white">
                        {Number(item.quantity)} {item.unit}
                      </td>
                      <td className="p-4 text-slate-400 text-sm hidden sm:table-cell">{item.location || '-'}</td>
                      <td className="p-4">
                        {Number(item.quantity) <= Number(item.minQuantity) ? (
                          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-medium border border-yellow-500/30 flex items-center gap-1 w-fit">
                            <AlertTriangle size={12} /> Baixo
                          </span>
                        ) : (
                          <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-medium border border-green-500/30 w-fit">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-2 bg-slate-800 hover:bg-blue-600 hover:text-white rounded-lg text-slate-400 transition-colors" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, 'Item')}
                            className="p-2 bg-slate-800 hover:bg-red-600 hover:text-white rounded-lg text-slate-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <button className="sm:hidden p-2 text-slate-400">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Tintas (Ink) */}
      {activeTab === 'ink' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {inkItems.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800/50">
              Nenhuma tinta cadastrada
            </div>
          ) : inkItems.map((ink) => (
            <div key={ink.id} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-slate-600 transition-colors">
              <div className={`absolute top-0 left-0 w-1 h-full ${getInkColorClass(ink.inkColor)}`} />

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-semibold text-lg">{ink.name}</h3>
                  <p className="text-slate-400 text-sm">{ink.printerModel || 'Modelo não especificado'}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 border-slate-600 ${getInkColorClass(ink.inkColor)}`} />
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-slate-500 text-xs">Quantidade</span>
                  <span className="text-2xl font-bold text-white">{Number(ink.quantity)} {ink.unit}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${Number(ink.quantity) <= 2 ? 'bg-red-500' :
                      Number(ink.quantity) <= Number(ink.minQuantity) ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                    style={{ width: `${Math.min(Number(ink.quantity) * 10, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-800/50">
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => openEdit(ink)}
                    className="flex-1 bg-slate-800 hover:bg-blue-600 hover:text-white py-2 rounded-lg text-slate-400 transition-colors flex items-center justify-center">
                    <Edit2 size={16} />
                  </button>
                  <button className="flex-1 bg-slate-800 hover:bg-green-600 hover:text-white py-2 rounded-lg text-slate-400 transition-colors flex items-center justify-center">
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Patrimônio (Assets) */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assetItems.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800/50">
              Nenhum patrimônio cadastrado
            </div>
          ) : assetItems.map((asset) => (
            <div key={asset.id} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 flex flex-col gap-3 group">
              <div className="flex justify-between items-start">
                <div className="bg-slate-800 p-3 rounded-lg text-slate-300">
                  <Monitor size={24} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(asset)}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id, 'Patrimônio')}
                    className="p-2 hover:bg-red-900/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold text-lg">{asset.name}</h3>
                <p className="text-slate-500 text-sm font-mono">{asset.assetTag || asset.code}</p>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-800/50 flex justify-between items-center text-sm">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${asset.assetStatus === 'AVAILABLE' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  asset.assetStatus === 'RESERVED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    asset.assetStatus === 'IN_USE' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                  {asset.assetStatus === 'AVAILABLE' ? 'Disponível' :
                    asset.assetStatus === 'RESERVED' ? 'Reservado' :
                      asset.assetStatus === 'IN_USE' ? 'Em Uso' :
                        'Manutenção'}
                </span>
                <div className="text-slate-400 flex items-center gap-1 text-xs">
                  <Package size={14} /> {asset.location || 'Sem local'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Timeline (Cronograma) */}
      {activeTab === 'timeline' && (
        <>
          {/* Desktop Timeline */}
          <div className="hidden md:flex bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden flex-col h-[600px]">
            {/* Timeline Header Controls */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <CalendarDays size={20} className="text-blue-500" />
                Cronograma de Reservas
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentWeekStart(prev => addDays(prev, -7))}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-slate-300">
                  {format(currentWeekStart, 'dd MMM', { locale: ptBR })} - {format(addDays(currentWeekStart, 6), 'dd MMM', { locale: ptBR })}
                </span>
                <button
                  onClick={() => setCurrentWeekStart(prev => addDays(prev, 7))}
                  className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 overflow-auto custom-scrollbar bg-slate-900">
              <div className="min-w-[800px]">
                {/* Days Header */}
                <div className="grid grid-cols-[200px_repeat(7,_1fr)] border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
                  <div className="p-4 border-r border-slate-800 text-slate-500 font-medium text-xs">Recurso</div>
                  {weekDays.map((day, i) => (
                    <div key={i} className={`p-4 text-center border-r border-slate-800/50 ${isSameDay(day, new Date()) ? 'bg-blue-900/20' : ''}`}>
                      <div className="text-slate-400 text-xs font-medium">{format(day, 'EEE', { locale: ptBR })}</div>
                      <div className={`text-sm font-bold mt-1 ${isSameDay(day, new Date()) ? 'text-blue-400' : 'text-white'}`}>
                        {format(day, 'dd', { locale: ptBR })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Asset Rows */}
                <div className="divide-y divide-slate-800/50">
                  {assetItems.map((asset) => (
                    <div key={asset.id} className="grid grid-cols-[200px_repeat(7,_1fr)] hover:bg-slate-800/20 transition-colors">
                      {/* Asset Info Column */}
                      <div className="p-4 border-r border-slate-800/50 flex flex-col justify-center sticky left-0 bg-slate-900 z-10">
                        <span className="text-white text-sm font-medium truncate" title={asset.name}>{asset.name}</span>
                        <span className="text-slate-500 text-xs truncate">{asset.assetTag || asset.code}</span>
                      </div>

                      {/* Days Columns */}
                      {weekDays.map((day, i) => {
                        const dayReservations = getReservationsForDay(asset.id, day);
                        return (
                          <div key={i} className="border-r border-slate-800/50 relative min-h-[60px] p-1">
                            {dayReservations.map((res) => (
                              <div
                                key={res.id}
                                className={`
                                   mb-1 p-1 rounded text-[10px] font-medium truncate shadow-sm cursor-pointer hover:opacity-80 transition-opacity
                                   ${res.status === 'APPROVED' || res.status === 'IN_USE' ? 'bg-blue-600 text-white' : 'bg-yellow-600/50 text-yellow-200 border border-yellow-600/50'}
                                 `}
                                title={`${res.userName} (${format(parseISO(res.startTime), 'HH:mm')} - ${format(parseISO(res.endTime), 'HH:mm')})`}
                              >
                                {res.userName}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Timeline (Compact) */}
          <div className="md:hidden">
            <MobileTimeline
              reservations={mobileTimelineReservations}
              onApprove={(id) => handleApprove(String(id))}
              onReject={(id) => handleReject(String(id))}
            />
          </div>
        </>
      )}

      <MobileFloatingMenu
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as any)}
        items={mobileMenuItems}
      />

      <StockFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSave}
        initialData={editingItem}
        defaultType={selectedDept === 'ELECTRIC' ? 'ELECTRIC' : 'TI'}
      />
    </div>
  );
}
