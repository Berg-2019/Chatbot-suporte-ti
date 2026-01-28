import { Printer, Plus, Search, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { useState } from 'react';

interface PrinterData {
  id: number;
  name: string;
  model: string;
  location: string;
  ipAddress: string;
  status: 'online' | 'offline' | 'warning';
  ink: {
    cyan: number;
    magenta: number;
    yellow: number;
    black: number;
  };
  prints: {
    today: number;
    month: number;
    total: number;
  };
  lastUpdate: string;
}

export default function PrintersView() {
  const [searchTerm, setSearchTerm] = useState('');

  const printers: PrinterData[] = [
    {
      id: 1,
      name: 'Impressora Recepção',
      model: 'HP LaserJet Pro M404dn',
      location: 'Recepção - 1º Andar',
      ipAddress: '192.168.1.101',
      status: 'online',
      ink: { cyan: 85, magenta: 90, yellow: 78, black: 65 },
      prints: { today: 45, month: 1250, total: 15680 },
      lastUpdate: '27/01/2026 11:30'
    },
    {
      id: 2,
      name: 'Impressora Financeiro',
      model: 'Epson EcoTank L3250',
      location: 'Financeiro - 2º Andar',
      ipAddress: '192.168.1.102',
      status: 'warning',
      ink: { cyan: 25, magenta: 15, yellow: 30, black: 45 },
      prints: { today: 78, month: 2340, total: 28940 },
      lastUpdate: '27/01/2026 11:25'
    },
    {
      id: 3,
      name: 'Impressora TI',
      model: 'Brother HL-L2350DW',
      location: 'TI - 3º Andar',
      ipAddress: '192.168.1.103',
      status: 'online',
      ink: { cyan: 0, magenta: 0, yellow: 0, black: 92 },
      prints: { today: 12, month: 456, total: 8920 },
      lastUpdate: '27/01/2026 11:28'
    },
    {
      id: 4,
      name: 'Impressora RH',
      model: 'Canon PIXMA G3260',
      location: 'RH - 2º Andar',
      ipAddress: '192.168.1.104',
      status: 'offline',
      ink: { cyan: 60, magenta: 55, yellow: 58, black: 72 },
      prints: { today: 0, month: 890, total: 12450 },
      lastUpdate: '26/01/2026 18:45'
    },
    {
      id: 5,
      name: 'Impressora Vendas',
      model: 'HP OfficeJet Pro 9015',
      location: 'Vendas - 1º Andar',
      ipAddress: '192.168.1.105',
      status: 'online',
      ink: { cyan: 95, magenta: 88, yellow: 92, black: 85 },
      prints: { today: 34, month: 1890, total: 22340 },
      lastUpdate: '27/01/2026 11:32'
    },
    {
      id: 6,
      name: 'Impressora Almoxarifado',
      model: 'Epson L3210',
      location: 'Almoxarifado - Térreo',
      ipAddress: '192.168.1.106',
      status: 'warning',
      ink: { cyan: 18, magenta: 22, yellow: 12, black: 8 },
      prints: { today: 56, month: 1670, total: 18920 },
      lastUpdate: '27/01/2026 11:20'
    },
  ];

  const filteredPrinters = printers.filter(printer =>
    printer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    printer.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: printers.length,
    online: printers.filter(p => p.status === 'online').length,
    offline: printers.filter(p => p.status === 'offline').length,
    warning: printers.filter(p => p.status === 'warning').length,
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
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Plus size={20} />
          <span className="hidden sm:inline">Adicionar Impressora</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Printer className="text-blue-500" size={24} />
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
                Verifique: {printers.filter(p => p.status === 'warning').map(p => p.name).join(', ')}
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
                {printers.filter(p => p.status === 'offline').map(p => p.name).join(', ')}
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
                  <Printer className="text-blue-400" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-1">{printer.name}</h3>
                  <p className="text-slate-400 text-sm mb-1">{printer.model}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>📍 {printer.location}</span>
                    <span>•</span>
                    <span>🌐 {printer.ipAddress}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                {getStatusIcon(printer.status)}
                <span className={`text-xs font-medium ${
                  printer.status === 'online' ? 'text-green-500' : 
                  printer.status === 'offline' ? 'text-red-500' : 'text-yellow-500'
                }`}>
                  {getStatusText(printer.status)}
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
                {Object.entries(printer.ink).map(([color, level]) => (
                  level > 0 && (
                    <div key={color}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400 capitalize">{
                          color === 'cyan' ? 'Ciano' :
                          color === 'magenta' ? 'Magenta' :
                          color === 'yellow' ? 'Amarelo' :
                          'Preto'
                        }</span>
                        <span className={`font-semibold ${
                          level < 20 ? 'text-red-400' : 
                          level < 40 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {level}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getInkColor(color)} transition-all`}
                          style={{ width: `${level}%` }}
                        />
                      </div>
                    </div>
                  )
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
          <Printer className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">Nenhuma impressora encontrada</p>
        </div>
      )}
    </div>
  );
}
