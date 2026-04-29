import { Printer as PrinterIcon, Plus, Search, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

import { printerApi, type Printer, type PrinterStatus } from '@/app/services/api';

import PrinterFormModal from '../modals/PrinterFormModal';
import { toast } from 'sonner';

// UI Helper type if needed, or just use Printer
interface PrinterViewModel extends Printer {
  prints: {
    today: number;
    month: number;
    total: number;
  };
  lastUpdate: string;
}

export default function PrintersView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);

  const [printers, setPrinters] = useState<PrinterViewModel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrinters = async () => {
    try {
      const data = await printerApi.getAllStatus();
      const mapped = data.map(p => ({
        ...p,
        prints: {
          today: 0, // Not available in API yet
          month: 0,
          total: p.status.pageCount || 0
        },
        lastUpdate: new Date().toLocaleString()
      }));
      setPrinters(mapped);
    } catch (err) {
      console.error('Failed to fetch printers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
    const interval = setInterval(fetchPrinters, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async (data: Partial<Printer>) => {
    try {
      if (editingPrinter) {
        await printerApi.update(editingPrinter.id, data);
        toast.success('Impressora atualizada com sucesso');
      } else {
        await printerApi.create(data);
        toast.success('Impressora criada com sucesso');
      }
      setIsModalOpen(false);
      setEditingPrinter(null);
      fetchPrinters();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar impressora');
    }
  };

  const filteredPrinters = printers.filter(printer =>
    printer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (printer.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (printer.status.model || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: printers.length,
    online: printers.filter(p => p.status.status === 'online').length,
    offline: printers.filter(p => p.status.status !== 'online').length,
    warning: printers.filter(p => (p.status.tonerBlack && p.status.tonerBlack < 20)).length,
  };

  const getInkColor = (type: string) => {
    switch (type) {
      case 'cyan': return 'bg-cyan-500';
      case 'magenta': return 'bg-pink-500';
      case 'yellow': return 'bg-yellow-400';
      case 'black': return 'bg-slate-800';
      default: return 'bg-slate-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="text-green-500" size={24} />;
      case 'offline':
        return <XCircle className="text-red-500" size={24} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={24} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'warning': return 'Atenção';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Monitoramento de Impressoras</h1>
          <p className="text-slate-400">Acompanhe o status e níveis de tinta das impressoras de rede</p>
        </div>
        <button
          onClick={() => {
            setEditingPrinter(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Adicionar Impressora</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <PrinterIcon className="text-blue-500" size={24} />
            <div className="text-slate-400 text-sm">Total</div>
          </div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-green-500" size={24} />
            <div className="text-slate-400 text-sm">Online</div>
          </div>
          <div className="text-3xl font-bold text-green-500">{stats.online}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="text-red-500" size={24} />
            <div className="text-slate-400 text-sm">Offline</div>
          </div>
          <div className="text-3xl font-bold text-red-500">{stats.offline}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-yellow-500" size={24} />
            <div className="text-slate-400 text-sm">Alertas</div>
          </div>
          <div className="text-3xl font-bold text-yellow-500">{stats.warning}</div>
        </div>
      </div>

      {/* Alerts */}
      {stats.warning > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-yellow-500" size={24} />
            <div>
              <h3 className="text-yellow-500 font-semibold">Atenção: {stats.warning} impressora(s) com nível de tinta baixo</h3>
              <p className="text-yellow-500/80 text-sm">
                Verifique: {printers.filter(p => p.status.status === 'warning').map(p => p.name).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.offline > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <XCircle className="text-red-500" size={24} />
            <div>
              <h3 className="text-red-500 font-semibold">Alerta: {stats.offline} impressora(s) offline</h3>
              <p className="text-red-500/80 text-sm">
                {printers.filter(p => p.status.status === 'offline').map(p => p.name).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar impressoras..."
            className="w-full bg-slate-800 text-white rounded-lg pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Printers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPrinters.map((printer) => (
          <div
            key={printer.id}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 hover:border-slate-700/50 transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-blue-600/20 rounded-lg">
                  <PrinterIcon className="text-blue-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-1">{printer.name}</h3>
                  <p className="text-slate-400 text-sm mb-1">{printer.status.model || 'Modelo desconhecido'}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>📍 {printer.location}</span>
                    <span>•</span>
                    <span>🌐 {printer.ip}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {getStatusIcon(printer.status.status)}
                <span className={`text-xs font-medium ${printer.status.status === 'online' ? 'text-green-500' :
                  printer.status.status === 'offline' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                  {getStatusText(printer.status.status)}
                </span>
              </div>
            </div>

            {/* Ink Levels */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="text-blue-400" size={16} />
                <h4 className="text-white font-medium text-sm">Níveis de Tinta</h4>
              </div>

              <div className="space-y-3">
                {/* Render simplified ink levels for now, mapping from properties */}
                {[
                  { color: 'black', level: printer.status.tonerBlack },
                  { color: 'cyan', level: printer.status.tonerCyan },
                  { color: 'magenta', level: printer.status.tonerMagenta },
                  { color: 'yellow', level: printer.status.tonerYellow }
                ].map(item => item.level !== undefined && (
                  <div key={item.color}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400 capitalize">{
                        item.color === 'cyan' ? 'Ciano' :
                          item.color === 'magenta' ? 'Magenta' :
                            item.color === 'yellow' ? 'Amarelo' :
                              'Preto'
                      }</span>
                      <span className={`font-semibold ${item.level < 20 ? 'text-red-400' :
                        item.level < 40 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                        {item.level}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getInkColor(item.color)} transition-all`}
                        style={{ width: `${item.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Print Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/50">
              <div>
                <div className="text-slate-400 text-xs mb-1">Hoje</div>
                <div className="text-white font-semibold">{printer.prints.today}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Este Mês</div>
                <div className="text-white font-semibold">{printer.prints.month.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Total</div>
                <div className="text-white font-semibold">{printer.prints.total.toLocaleString()}</div>
              </div>
            </div>

            {/* Last Update */}
            <div className="text-xs text-slate-500 mt-4 text-right">
              Atualizado: {printer.lastUpdate}
            </div>
          </div>
        ))}
      </div>

      {filteredPrinters.length === 0 && (
        <div className="text-center py-12">
          <PrinterIcon className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">Nenhuma impressora encontrada</p>
        </div>
      )}

      <PrinterFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleSave}
        initialData={editingPrinter}
      />
    </div>
  );
}
