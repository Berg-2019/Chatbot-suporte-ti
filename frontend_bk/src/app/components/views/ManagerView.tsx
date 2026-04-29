import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, FileText, CheckCircle, Clock, Package, ArrowUpRight, ArrowDownLeft, TrendingUp, Zap, Monitor, Calendar, LayoutDashboard, BarChart3, Boxes, Users2, RefreshCw, Printer, AlertTriangle, Droplet } from 'lucide-react';
import { format, isSameDay, addHours, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBadges } from '@/app/hooks/useBadges';
import { useAgentStatus } from '@/app/hooks/useAgentStatus';
import StatusBadge from '@/app/components/ui/StatusBadge';

// --- MOCK DATA ---

interface TimelineReservation {
  id: number;
  assetId: number;
  assetName: string;
  userName: string;
  startTime: Date;
  endTime: Date;
  status: 'approved' | 'pending';
}

const timelineReservations: TimelineReservation[] = [
  { id: 1, assetId: 1, assetName: 'Projetor Epson', userName: 'João Silva', startTime: addHours(new Date(), -1), endTime: addHours(new Date(), 1), status: 'approved' },
  { id: 2, assetId: 2, assetName: 'Notebook Dell', userName: 'Maria Souza', startTime: new Date(), endTime: addHours(new Date(), 24), status: 'approved' },
  { id: 4, assetId: 5, assetName: 'Microfone Sem Fio', userName: 'Carlos Marketing', startTime: addHours(new Date(), 2), endTime: addHours(new Date(), 4), status: 'pending' },
  { id: 5, assetId: 3, assetName: 'Caixa de Som JBL', userName: 'Reunião Diretoria', startTime: addHours(new Date(), 3), endTime: addHours(new Date(), 5), status: 'approved' },
  { id: 6, assetId: 1, assetName: 'Projetor Epson', userName: 'Treinamento RH', startTime: addHours(new Date(), 5), endTime: addHours(new Date(), 7), status: 'approved' },
  { id: 7, assetId: 4, assetName: 'MacBook Pro', userName: 'Edição Vídeo', startTime: addHours(new Date(), 1), endTime: addHours(new Date(), 6), status: 'pending' },
];

const todayReservations = timelineReservations.filter(res => 
  isSameDay(res.startTime, new Date()) || 
  (res.startTime < new Date() && res.endTime > new Date())
).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

const monthlyData = [
  { name: 'Jan', ti: 45, eletrica: 20 },
  { name: 'Fev', ti: 52, eletrica: 25 },
  { name: 'Mar', ti: 48, eletrica: 22 },
  { name: 'Abr', ti: 61, eletrica: 28 },
  { name: 'Mai', ti: 55, eletrica: 24 },
  { name: 'Jun', ti: 67, eletrica: 30 },
];

const statusData = [
  { name: 'Concluídos', value: 450, color: '#22c55e' },
  { name: 'Em Aberto', value: 80, color: '#eab308' },
  { name: 'Atrasados', value: 20, color: '#ef4444' },
];

const teamPerformance = [
  { name: 'Gustavo (TI)', tickets: 45, rating: 4.8 },
  { name: 'Robison (TI)', tickets: 42, rating: 4.9 },
  { name: 'Carlos (Elétrica)', tickets: 30, rating: 4.7 },
  { name: 'Ana (TI)', tickets: 38, rating: 4.6 },
];

const stockMovements = [
  { id: 1, date: '10:30', type: 'out', item: 'Cabo Rede 3m', qtd: 2, dept: 'TI', value: 'R$ 30,00', user: 'Gustavo' },
  { id: 2, date: '09:15', type: 'in', item: 'Lâmpada LED', qtd: 50, dept: 'Elétrica', value: 'R$ 450,00', user: 'Carlos' },
  { id: 3, date: 'Ontem', type: 'out', item: 'Mouse USB', qtd: 1, dept: 'TI', value: 'R$ 35,00', user: 'Robison' },
  { id: 4, date: 'Ontem', type: 'out', item: 'Disjuntor 20A', qtd: 3, dept: 'Elétrica', value: 'R$ 45,00', user: 'Carlos' },
];

const printersMock = [
  { id: 1, name: 'HP Deskjet (Recepção)', status: 'ok', tonerLevel: 85, queue: 0 },
  { id: 2, name: 'Brother Laser (RH)', status: 'low', tonerLevel: 15, queue: 2 },
  { id: 3, name: 'Epson EcoTank (Marketing)', status: 'ok', tonerLevel: 60, queue: 0 },
  { id: 4, name: 'Zebra Etiquetas (Estoque)', status: 'error', tonerLevel: 0, queue: 5 },
];

// --- COMPONENT ---

export default function ManagerView() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, stock, team
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [printerIndex, setPrinterIndex] = useState(0);
  const [timelinePage, setTimelinePage] = useState(0);
  const badges = useBadges();
  const { agents } = useAgentStatus();

  const tabs = ['overview', 'stock', 'team'];
  const TIMELINE_ITEMS_PER_PAGE = 4;

  // Auto-Rotate TABS (Page) - 30 Seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((current) => {
        const currentIndex = tabs.indexOf(current);
        const nextIndex = (currentIndex + 1) % tabs.length;
        return tabs[nextIndex];
      });
    }, 30000); 

    return () => clearInterval(interval);
  }, []);

  // Auto-Rotate PRINTERS - 5 Seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPrinterIndex((current) => (current + 1) % printersMock.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-Rotate TIMELINE - 10 Seconds
  useEffect(() => {
    if (todayReservations.length <= TIMELINE_ITEMS_PER_PAGE) return;
    
    const interval = setInterval(() => {
      setTimelinePage((current) => {
        const totalPages = Math.ceil(todayReservations.length / TIMELINE_ITEMS_PER_PAGE);
        return (current + 1) % totalPages;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Clock Update
  useEffect(() => {
    const interval = setInterval(() => setLastUpdate(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // -- RENDERERS --

  const renderAgentStatus = () => (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800 shadow-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
          <Users2 size={14} className="text-blue-500" /> Status dos Agentes
        </h3>
        <span className="text-xs text-slate-500">
          {agents.filter(a => a.status === 'ONLINE' || a.status === 'IN_SERVICE').length}/{agents.length} disponíveis
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {agents.length > 0 ? (
          agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0"
                >
                  {agent.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{agent.name}</p>
                  <p className="text-slate-500 text-[10px] truncate">{agent.sector}</p>
                </div>
              </div>
              <StatusBadge status={agent.status} size="sm" showLabel={true} />
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-slate-500 text-xs py-4">
            Nenhum agente conectado
          </div>
        )}
      </div>
    </div>
  );

  const renderMetrics = () => (
    <div className="grid grid-cols-4 gap-4 h-24">
      <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3 shadow-lg">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><FileText size={20} /></div>
          <div><p className="text-slate-400 text-xs font-medium">Chamados</p><h3 className="text-2xl font-bold text-white">156</h3></div>
      </div>
      <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3 shadow-lg">
          <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500"><Clock size={20} /></div>
          <div><p className="text-slate-400 text-xs font-medium">T. Médio</p><h3 className="text-2xl font-bold text-white">2h 15m</h3></div>
      </div>
      <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3 shadow-lg">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500"><Users size={20} /></div>
          <div><p className="text-slate-400 text-xs font-medium">NPS</p><h3 className="text-2xl font-bold text-white">4.8</h3></div>
      </div>
      <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3 shadow-lg">
          <div className="p-2 rounded-lg bg-green-500/10 text-green-500"><CheckCircle size={20} /></div>
          <div><p className="text-slate-400 text-xs font-medium">Conclusão</p><h3 className="text-2xl font-bold text-white">94%</h3></div>
      </div>
    </div>
  );

  const renderTimelineThin = () => {
    const startIndex = timelinePage * TIMELINE_ITEMS_PER_PAGE;
    const visibleReservations = todayReservations.slice(startIndex, startIndex + TIMELINE_ITEMS_PER_PAGE);
    const totalPages = Math.ceil(todayReservations.length / TIMELINE_ITEMS_PER_PAGE);

    return (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden shadow-lg h-full flex flex-col relative group">
          <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-800/30 z-10">
             <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2">
               <Calendar size={14} className="text-blue-500" /> Agenda
             </h2>
             <div className="flex items-center gap-2">
               {totalPages > 1 && (
                 <div className="flex gap-1">
                   {Array.from({ length: totalPages }).map((_, idx) => (
                     <div 
                       key={idx} 
                       className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === timelinePage ? 'bg-blue-500' : 'bg-slate-700'}`}
                     />
                   ))}
                 </div>
               )}
               <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 rounded-full border border-blue-500/20 font-medium">
                 {todayReservations.length} Reservas
               </span>
             </div>
          </div>
          
          <div className="p-2 flex-1 overflow-hidden relative">
            <AnimatePresence mode='wait'>
              <motion.div 
                key={timelinePage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex gap-2 w-full h-full items-center"
              >
                {visibleReservations.length > 0 ? (
                  visibleReservations.map((res) => {
                    const isNow = new Date() >= res.startTime && new Date() <= res.endTime;
                    return (
                      <div key={res.id} className={`flex-1 min-w-0 p-3 rounded-lg border flex flex-col justify-between h-full ${isNow ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-800/40 border-slate-700/50'}`}>
                          <div className="flex justify-between items-center mb-1">
                             <div className={`text-[11px] font-bold ${isNow ? 'text-blue-300' : 'text-slate-400'}`}>
                               {format(res.startTime, 'HH:mm')} - {format(res.endTime, 'HH:mm')}
                             </div>
                             {isNow && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                          </div>
                          <div className="flex flex-col justify-center flex-1 min-h-0">
                             <div className="text-white font-bold text-sm truncate leading-tight mb-0.5" title={res.assetName}>{res.assetName}</div>
                             <div className="text-[11px] text-slate-500 truncate leading-tight">{res.userName}</div>
                          </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-slate-500 text-xs text-center w-full flex items-center justify-center h-full gap-2">
                    <Clock size={16} /> Nenhuma reserva para hoje.
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
      </div>
    );
  };

  const renderMovements = () => (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800 flex flex-col shadow-lg overflow-hidden flex-1">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide flex items-center gap-2"><ArrowUpRight size={14} className="text-orange-500" /> Movimentação</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs text-slate-400">
          <tbody className="divide-y divide-slate-800/50">
            {stockMovements.map((move) => (
              <tr key={move.id} className="hover:bg-slate-800/30">
                <td className="px-3 py-2 text-[10px] font-mono">{move.date}</td>
                <td className="px-3 py-2">
                  {move.type === 'in' 
                    ? <span className="text-green-400 font-bold"><ArrowDownLeft size={10} className="inline"/> Ent</span> 
                    : <span className="text-orange-400 font-bold"><ArrowUpRight size={10} className="inline"/> Sai</span>
                  }
                </td>
                <td className="px-3 py-2 font-medium text-white truncate max-w-[100px]">{move.item}</td>
                <td className="px-3 py-2 text-right text-slate-500">{move.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderPrinterCarousel = () => {
    const printer = printersMock[printerIndex];
    return (
      <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800 overflow-hidden shadow-lg h-32 relative group">
        <div className="absolute top-2 right-2 flex gap-1">
           {printersMock.map((_, idx) => (
             <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === printerIndex ? 'w-4 bg-white' : 'w-1.5 bg-slate-600'}`} />
           ))}
        </div>
        
        <div className="p-4 flex items-center h-full gap-4">
           <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 ${
             printer.status === 'ok' ? 'bg-green-500/10 text-green-500' : 
             printer.status === 'low' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
           }`}>
             <Printer size={32} />
           </div>
           
           <div className="flex-1 min-w-0">
              <h4 className="text-white font-bold text-lg truncate">{printer.name}</h4>
              <div className="flex items-center gap-4 mt-2">
                 <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                       <span className="text-slate-400 flex items-center gap-1"><Droplet size={10}/> Toner</span>
                       <span className={printer.tonerLevel < 20 ? 'text-red-400 font-bold' : 'text-slate-300'}>{printer.tonerLevel}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div 
                         className={`h-full rounded-full transition-all duration-500 ${printer.tonerLevel < 20 ? 'bg-red-500' : 'bg-cyan-500'}`} 
                         style={{ width: `${printer.tonerLevel}%` }} 
                       />
                    </div>
                 </div>
                 {printer.queue > 0 && (
                   <div className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                     <span className="font-bold text-white">{printer.queue}</span> Docs
                   </div>
                 )}
              </div>
           </div>
        </div>
        
        {printer.status === 'error' && (
          <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[1px] flex items-center justify-center animate-pulse border-2 border-red-500 rounded-xl">
             <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-xl flex items-center gap-2">
               <AlertTriangle size={20} /> ERRO DE IMPRESSÃO
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderCharts = () => (
    <div className="bg-slate-900/80 backdrop-blur-sm p-4 rounded-xl border border-slate-800 shadow-lg flex-1 min-h-0 flex flex-col">
      <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
        <BarChart3 size={16} className="text-blue-500" /> Métricas e Distribuição
      </h3>
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 h-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 10}} interval={0} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
              <Bar dataKey="ti" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="eletrica" fill="#eab308" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="w-1/3 h-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">
                {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Legend verticalAlign="bottom" height={20} iconSize={8} wrapperStyle={{fontSize: '10px'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderStock = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Monitor size={100} /></div>
          <p className="text-slate-400 text-sm mb-2 font-medium uppercase tracking-wide">Valor em Estoque (TI)</p>
          <h4 className="text-4xl font-bold text-white mb-4">R$ 12.450,00</h4>
          <div className="flex gap-2"><span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-sm font-medium border border-blue-500/20">142 Itens</span></div>
        </div>
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={100} /></div>
            <p className="text-slate-400 text-sm mb-2 font-medium uppercase tracking-wide">Valor em Estoque (Elétrica)</p>
            <h4 className="text-4xl font-bold text-white mb-4">R$ 8.320,00</h4>
            <div className="flex gap-2"><span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-lg text-sm font-medium border border-yellow-500/20">85 Itens</span></div>
        </div>
      </div>
      {renderMovements()} 
    </div>
  );

  const renderTeam = () => (
    <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden shadow-lg h-full">
      <div className="p-6 border-b border-slate-800 bg-slate-800/30"><h3 className="text-xl font-bold text-white flex items-center gap-2"><Users2 className="text-blue-500" /> Produtividade da Equipe</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-slate-400">
          <thead className="bg-slate-800/50 text-slate-200 uppercase font-bold text-sm tracking-wider">
            <tr>
              <th className="px-8 py-5">Técnico</th>
              <th className="px-8 py-5 text-center">Tickets Resolvidos</th>
              <th className="px-8 py-5 text-center">Avaliação Média</th>
              <th className="px-8 py-5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-base">
            {teamPerformance.map((member, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-8 py-6 font-bold text-white flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${idx % 2 === 0 ? 'bg-blue-600' : 'bg-purple-600'}`}>
                    {member.name.charAt(0)}
                  </div>
                  {member.name}
                </td>
                <td className="px-8 py-6 text-center">
                  <span className="bg-slate-800 px-4 py-1 rounded-full text-white font-mono font-bold">{member.tickets}</span>
                </td>
                <td className="px-8 py-6 text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-400 font-bold">
                    <span className="text-xl">{member.rating}</span> <span className="text-sm opacity-70">/ 5.0</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/20">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> ONLINE
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white relative">
      {/* COMPACT TV Header */}
      <div className="px-6 py-3 flex items-center justify-between bg-slate-950/80 backdrop-blur border-b border-slate-900 sticky top-0 z-30 h-16">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">PAINEL GESTÃO</h1>
          </div>
        </div>
        
        {/* Progress Bar for Page Rotation */}
        <div className="absolute bottom-0 left-0 h-0.5 bg-slate-800 w-full">
           <motion.div 
             key={activeTab} // Reset animation on tab change
             initial={{ width: "0%" }}
             animate={{ width: "100%" }}
             transition={{ duration: 30, ease: "linear" }}
             className="h-full bg-blue-500"
           />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-lg font-mono font-bold text-slate-200">{format(lastUpdate, 'HH:mm')}</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-hidden relative">
        <AnimatePresence mode='wait'>
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-4 h-full"
            >
              {renderAgentStatus()}
              {renderMetrics()}

              <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
                 {/* LEFT COL (7 cols) - Agenda Top + Charts Bottom */}
                 <div className="col-span-8 flex flex-col gap-4">
                    <div className="h-32">
                      {renderTimelineThin()}
                    </div>
                    {renderCharts()}
                 </div>

                 {/* RIGHT COL (5 cols) - Movements + Printer Carousel */}
                 <div className="col-span-4 flex flex-col gap-4">
                    {renderMovements()}
                    {renderPrinterCarousel()}
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'stock' && (
            <motion.div 
              key="stock"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="h-full"
            >
              {renderStock()}
            </motion.div>
          )}

          {activeTab === 'team' && (
            <motion.div 
              key="team"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="h-full"
            >
              {renderTeam()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar / Legend (Bottom) */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 px-2 py-1.5 rounded-full shadow-2xl flex items-center gap-2">
          {tabs.map(tab => (
            <div 
              key={tab}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${activeTab === tab ? 'bg-blue-500 scale-125' : 'bg-slate-600'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
