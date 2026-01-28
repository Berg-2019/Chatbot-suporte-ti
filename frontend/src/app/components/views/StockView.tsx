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
  CalendarClock
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';
import { addDays, format, startOfWeek, addHours, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MobileFloatingMenu from '@/app/components/MobileFloatingMenu';
import MobileTimeline from '@/app/components/MobileTimeline';
import { useBadges } from '@/app/hooks/useBadges';

interface StockItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  location: string;
  lastUpdate: string;
  type: 'ti' | 'elect';
}

interface InkItem {
  id: number;
  name: string;
  color: 'cyan' | 'magenta' | 'yellow' | 'black';
  model: string;
  quantity: number;
  printerModel: string;
  status: 'ok' | 'low' | 'critical';
}

interface Asset {
  id: number;
  name: string;
  tag: string;
  type: 'projector' | 'notebook' | 'tool' | 'audio' | 'other';
  status: 'available' | 'reserved' | 'maintenance';
  location: string;
}

// Mock de Reservas para Timeline
interface TimelineReservation {
  id: number;
  assetId: number;
  assetName: string;
  userName: string;
  startTime: Date;
  endTime: Date;
  status: 'approved' | 'pending';
}

export default function StockView() {
  const [searchTerm, setSearchTerm] = useState('');
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'supplies' | 'ink' | 'assets' | 'timeline'>('assets');
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const badges = useBadges();

  // Dados Mockados - Insumos
  const stockItems: StockItem[] = [
    { id: 1, name: 'Mouse USB', category: 'Hardware', quantity: 15, minQuantity: 10, location: 'Almoxarifado A', lastUpdate: '25/01/2026', type: 'ti' },
    { id: 2, name: 'Teclado ABNT2', category: 'Hardware', quantity: 8, minQuantity: 10, location: 'Almoxarifado A', lastUpdate: '24/01/2026', type: 'ti' },
    { id: 3, name: 'Monitor 24"', category: 'Hardware', quantity: 3, minQuantity: 5, location: 'Almoxarifado B', lastUpdate: '23/01/2026', type: 'ti' },
    { id: 4, name: 'Cabo HDMI', category: 'Acessórios', quantity: 25, minQuantity: 15, location: 'Almoxarifado A', lastUpdate: '27/01/2026', type: 'ti' },
    { id: 101, name: 'Disjuntor 20A', category: 'Componentes', quantity: 30, minQuantity: 10, location: 'Almoxarifado Elétrica', lastUpdate: '26/01/2026', type: 'elect' },
    { id: 103, name: 'Lâmpada LED 9W', category: 'Iluminação', quantity: 45, minQuantity: 15, location: 'Almoxarifado Elétrica', lastUpdate: '22/01/2026', type: 'elect' },
  ];

  // Dados Mockados - Tintas
  const inkItems: InkItem[] = [
    { id: 1, name: 'Cartucho Preto HP 662', color: 'black', model: 'HP 662', quantity: 12, printerModel: 'HP Deskjet Ink Advantage', status: 'ok' },
    { id: 2, name: 'Cartucho Colorido HP 662', color: 'magenta', model: 'HP 662', quantity: 3, printerModel: 'HP Deskjet Ink Advantage', status: 'low' },
    { id: 3, name: 'Toner Preto Brother 1060', color: 'black', model: 'TN-1060', quantity: 5, printerModel: 'Brother HL-1202', status: 'ok' },
    { id: 4, name: 'Tinta Ciano Epson T544', color: 'cyan', model: 'T544', quantity: 1, printerModel: 'Epson L3150', status: 'critical' },
    { id: 5, name: 'Tinta Amarela Epson T544', color: 'yellow', model: 'T544', quantity: 8, printerModel: 'Epson L3150', status: 'ok' },
  ];

  // Dados Mockados - Patrimônio
  const assetItems: Asset[] = [
    { id: 1, name: 'Projetor Epson PowerLite', tag: 'PAT-00123', type: 'projector', status: 'available', location: 'Armário TI' },
    { id: 2, name: 'Notebook Dell Latitude 3420', tag: 'PAT-00456', type: 'notebook', status: 'reserved', location: 'Emprestado' },
    { id: 3, name: 'Caixa de Som JBL', tag: 'PAT-00789', type: 'audio', status: 'available', location: 'Armário TI' },
    { id: 4, name: 'Parafusadeira Bosch', tag: 'PAT-00101', type: 'tool', status: 'maintenance', location: 'Manutenção' },
    { id: 5, name: 'Microfone Sem Fio', tag: 'PAT-00202', type: 'audio', status: 'available', location: 'Armário TI' },
  ];

  // Mock de Reservas para Timeline
  const [timelineReservations, setTimelineReservations] = useState<TimelineReservation[]>([
    { id: 1, assetId: 1, assetName: 'Projetor Epson', userName: 'João Silva', startTime: addHours(new Date(), -1), endTime: addHours(new Date(), 1), status: 'approved' },
    { id: 2, assetId: 2, assetName: 'Notebook Dell', userName: 'Maria Souza', startTime: new Date(), endTime: addHours(new Date(), 24), status: 'approved' },
    { id: 4, assetId: 5, assetName: 'Microfone Sem Fio', userName: 'Carlos Marketing', startTime: addHours(new Date(), 2), endTime: addHours(new Date(), 4), status: 'pending' },
    { id: 3, assetId: 3, assetName: 'Caixa de Som JBL', userName: 'Pedro RH', startTime: addDays(new Date(), 1), endTime: addDays(new Date(), 1.5), status: 'pending' },
  ]);

  // Filtragem
  const filteredStock = stockItems.filter(item => {
    if (profile === 'tech_ti' && item.type !== 'ti') return false;
    if (profile === 'tech_elect' && item.type !== 'elect') return false;
    return item.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getInkColorClass = (color: string) => {
    switch (color) {
      case 'cyan': return 'bg-cyan-500';
      case 'magenta': return 'bg-pink-500';
      case 'yellow': return 'bg-yellow-400';
      case 'black': return 'bg-slate-950';
      default: return 'bg-slate-500';
    }
  };

  const handleDelete = (id: number, type: string) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      toast.success(`${type} excluído com sucesso.`);
    }
  };

  const handleApprove = (id: number) => {
    setTimelineReservations(prev => prev.map(res => res.id === id ? { ...res, status: 'approved' } : res));
    toast.success('Reserva aprovada!');
  };

  const handleReject = (id: number) => {
    setTimelineReservations(prev => prev.filter(res => res.id !== id));
    toast.error('Reserva rejeitada.');
  };

  // Funções para Timeline
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getReservationsForDay = (assetId: number, day: Date) => {
    return timelineReservations.filter(res => 
      res.assetId === assetId && 
      (isSameDay(res.startTime, day) || isSameDay(res.endTime, day) || (res.startTime < day && res.endTime > day))
    );
  };

  const mobileMenuItems = [
    { id: 'assets', icon: Monitor, label: 'Patrimônio', badge: badges.stock },
    { id: 'supplies', icon: Boxes, label: 'Insumos', badge: 0 },
    ...(profile !== 'tech_elect' ? [{ id: 'ink', icon: Printer, label: 'Tintas', badge: 0 }] : []),
    { id: 'timeline', icon: CalendarClock, label: 'Cronograma', badge: 0 },
  ];

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
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors w-full sm:w-auto shadow-lg shadow-blue-900/20 active:scale-95">
          <Plus size={20} />
          <span className="font-medium">Novo Item</span>
        </button>
      </div>

      {/* Navigation Tabs - DESKTOP ONLY */}
      <div className="hidden md:flex gap-2 pb-2 border-b border-slate-700 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'assets' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Monitor size={18} /> Patrimônio
        </button>
        <button 
          onClick={() => setActiveTab('supplies')}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'supplies' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Package size={18} /> Insumos
        </button>
        {profile !== 'tech_elect' && (
          <button 
            onClick={() => setActiveTab('ink')}
            className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === 'ink' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Droplet size={18} /> Tintas e Toners
          </button>
        )}
        <button 
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'timeline' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
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
              <div className="text-3xl font-bold text-white">{filteredStock.reduce((acc, i) => acc + i.quantity, 0)}</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="text-green-500" size={24} />
                <div className="text-slate-400 text-sm">Categorias</div>
              </div>
              <div className="text-3xl font-bold text-white">
                {Array.from(new Set(filteredStock.map(item => item.category))).length}
              </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="text-yellow-500" size={24} />
                <div className="text-slate-400 text-sm">Estoque Baixo</div>
              </div>
              <div className="text-3xl font-bold text-yellow-500">
                {filteredStock.filter(i => i.quantity <= i.minQuantity).length}
              </div>
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
                    <th className="text-left p-4 text-slate-400 font-medium text-sm hidden md:table-cell">Categoria</th>
                    <th className="text-left p-4 text-slate-400 font-medium text-sm">Qtd.</th>
                    <th className="text-left p-4 text-slate-400 font-medium text-sm hidden sm:table-cell">Local</th>
                    <th className="text-left p-4 text-slate-400 font-medium text-sm">Status</th>
                    <th className="text-right p-4 text-slate-400 font-medium text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group">
                      <td className="p-4">
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-xs text-slate-500 md:hidden">{item.category}</div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <span className="bg-slate-700 px-2 py-1 rounded text-xs text-slate-300">{item.category}</span>
                      </td>
                      <td className="p-4 font-bold text-white">{item.quantity}</td>
                      <td className="p-4 text-slate-400 text-sm hidden sm:table-cell">{item.location}</td>
                      <td className="p-4">
                        {item.quantity <= item.minQuantity ? (
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
                          <button className="p-2 bg-slate-800 hover:bg-blue-600 hover:text-white rounded-lg text-slate-400 transition-colors" title="Editar">
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
                        {/* Mobile Action Menu Fallback (Simplified) */}
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
          {inkItems.map((ink) => (
            <div key={ink.id} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-slate-600 transition-colors">
              <div className={`absolute top-0 left-0 w-1 h-full ${getInkColorClass(ink.color)}`} />
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-semibold text-lg">{ink.model}</h3>
                  <p className="text-slate-400 text-sm">{ink.printerModel}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 border-slate-600 ${getInkColorClass(ink.color)}`} />
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-slate-500 text-xs">Quantidade</span>
                  <span className="text-2xl font-bold text-white">{ink.quantity}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      ink.status === 'critical' ? 'bg-red-500' : 
                      ink.status === 'low' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} 
                    style={{ width: `${Math.min(ink.quantity * 10, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-800/50">
                <div className="flex gap-2 w-full">
                  <button className="flex-1 bg-slate-800 hover:bg-blue-600 hover:text-white py-2 rounded-lg text-slate-400 transition-colors flex items-center justify-center">
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
          {assetItems.map((asset) => (
            <div key={asset.id} className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 flex flex-col gap-3 group">
              <div className="flex justify-between items-start">
                <div className="bg-slate-800 p-3 rounded-lg text-slate-300">
                  {asset.type === 'projector' ? <Monitor size={24} /> : 
                   asset.type === 'notebook' ? <Package size={24} /> : 
                   <CheckCircle2 size={24} />}
                </div>
                <div className="flex gap-2">
                   <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
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
                <p className="text-slate-500 text-sm font-mono">{asset.tag}</p>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-800/50 flex justify-between items-center text-sm">
                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${
                  asset.status === 'available' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  asset.status === 'reserved' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {asset.status === 'available' ? 'Disponível' : 
                   asset.status === 'reserved' ? 'Reservado' : 'Manutenção'}
                </span>
                <div className="text-slate-400 flex items-center gap-1 text-xs">
                  <Package size={14} /> {asset.location}
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
                         <span className="text-slate-500 text-xs truncate">{asset.tag}</span>
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
                                   ${res.status === 'approved' ? 'bg-blue-600 text-white' : 'bg-yellow-600/50 text-yellow-200 border border-yellow-600/50'}
                                 `}
                                 title={`${res.userName} (${format(res.startTime, 'HH:mm')} - ${format(res.endTime, 'HH:mm')})`}
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
              reservations={timelineReservations} 
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </div>
        </>
      )}

      {/* MOBILE FLOATING MENU */}
      <MobileFloatingMenu 
        activeId={activeTab} 
        onSelect={(id) => setActiveTab(id as any)}
        items={mobileMenuItems}
      />
    </div>
  );
}
