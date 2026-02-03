import { Zap, AlertTriangle, CheckCircle, Clock, Plus, X, MapPin, User, FileText, CalendarClock, MessageCircle, XCircle, CheckCircle2, LayoutDashboard, ListTodo } from 'lucide-react';
import MetricCard from '../MetricCard';
import ReservationChat from '../ReservationChat';
import MobileFloatingMenu from '../MobileFloatingMenu';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBadges } from '../../hooks/useBadges';
import { ticketsApi, reservationApi, type Ticket, type Reservation } from '../../services/api';

const data = [
  { name: 'Seg', chamados: 4 },
  { name: 'Ter', chamados: 6 },
  { name: 'Qua', chamados: 8 },
  { name: 'Qui', chamados: 5 },
  { name: 'Sex', chamados: 9 },
  { name: 'Sab', chamados: 3 },
  { name: 'Dom', chamados: 2 },
];

// Timeline helper type (could be same as Reservation but simplified for chart/timeline)
interface TimelineReservation extends Reservation { }

interface ElectricalDashboardViewProps {
  onTicketClick: (ticket: Ticket) => void;
  refreshTrigger?: number;
}

export default function ElectricalDashboardView({ onTicketClick, refreshTrigger }: ElectricalDashboardViewProps) {
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [activeReservationChat, setActiveReservationChat] = useState<{ requester: string, assetName: string, id: number } | null>(null);
  const badges = useBadges();

  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState('home');

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [timelineReservations, setTimelineReservations] = useState<Reservation[]>([]);
  const [requests, setRequests] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [ticketsRes, reservationsAll] = await Promise.all([
        ticketsApi.getAll({ category: 'Elétrica' }),
        reservationApi.getAll()
      ]);
      setRequests(ticketsRes.tickets);
      setReservations(reservationsAll);

      // Simple timeline mapping or separate fetch
      setTimelineReservations(reservationsAll.filter((r: Reservation) => r.status === 'APPROVED' || r.status === 'PENDING'));

    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      toast.error('Erro ao atualizar painel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const todayReservations = timelineReservations.filter(res => {
    const start = new Date(res.startTime);
    const end = new Date(res.endTime);
    return isSameDay(start, new Date()) || (start < new Date() && end > new Date());
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const handleApproveReservation = async (id: number) => {
    try {
      await reservationApi.approve(id.toString());
      toast.success('Reserva aprovada com sucesso!');
      fetchData();
    } catch {
      toast.error('Erro ao aprovar');
    }
  };

  const handleRejectReservation = async (id: number) => {
    try {
      await reservationApi.reject(id.toString());
      toast.error('Reserva rejeitada.');
      fetchData();
    } catch {
      toast.error('Erro ao rejeitar');
    }
  };

  const handleOpenChat = (reservation: Reservation) => {
    setActiveReservationChat({
      requester: reservation.userName,
      assetName: reservation.stockItem?.name || 'Item',
      id: Number(reservation.id)
    });
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Ordem de Serviço criada com sucesso!');
    setIsNewOrderModalOpen(false);
  };

  // Render Functions for Components
  const renderMetrics = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard label="Pendentes" value="12" trend="+2" trendUp={false} icon={AlertTriangle} iconColor="text-yellow-500" />
      <MetricCard label="Em Andamento" value="5" trend="Estável" icon={Clock} iconColor="text-blue-500" />
      <MetricCard label="Concluídas" value="8" trend="+3" trendUp={true} icon={CheckCircle} iconColor="text-green-500" />
      <MetricCard label="Consumo" value="1.2k" trend="-5%" trendUp={true} icon={Zap} iconColor="text-purple-500" />
    </div>
  );

  const renderSchedule = () => (
    <div className="bg-gradient-to-r from-slate-900 to-slate-900 border border-yellow-900/30 rounded-2xl overflow-hidden relative shadow-2xl">
      <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50 bg-slate-800/20">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500"><CalendarClock size={24} /></div>
          <div>
            <h2 className="text-white font-bold text-lg uppercase tracking-wide">Agenda</h2>
            <p className="text-slate-400 text-xs font-medium">{format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
        </div>
      </div>
      <div className="p-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-4 min-w-max">
          {todayReservations.length > 0 ? (
            todayReservations.map((res) => {
              const start = new Date(res.startTime);
              const end = new Date(res.endTime);
              const now = new Date();
              const isNow = now >= start && now <= end;
              return (
                <div key={res.id} onClick={() => setActiveReservationChat({ requester: res.userName, assetName: res.stockItem?.name || 'Item', id: Number(res.id) })}
                  className={`relative flex flex-col min-w-[200px] p-3 rounded-xl border transition-all cursor-pointer
                  ${isNow ? 'bg-yellow-600/10 border-yellow-500/50' : 'bg-slate-800/30 border-slate-700/50'}`}>
                  {isNow && <span className="absolute -top-2 -right-2 bg-yellow-600 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">EM USO</span>}
                  <div className="flex justify-between items-start mb-2">
                    <div className={`text-xs font-bold px-2 py-1 rounded bg-slate-900/50 ${isNow ? 'text-yellow-500' : 'text-slate-400'}`}>
                      {format(res.startTime, 'HH:mm')} - {format(res.endTime, 'HH:mm')}
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-white font-semibold truncate">{res.stockItem?.name || 'Item sem nome'}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1"><User size={12} /> {res.userName}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center gap-4 text-slate-500 p-2 italic w-full justify-center">
              <Clock size={20} className="text-slate-600" /> Nenhuma reserva hoje.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderChart = () => (
    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800/50">
      <h3 className="text-lg font-semibold text-white mb-4">Volume (Semana)</h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorElect" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }} itemStyle={{ color: '#eab308' }} />
            <Area type="monotone" dataKey="chamados" stroke="#eab308" fillOpacity={1} fill="url(#colorElect)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderTicketsList = () => (
    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800/50 flex flex-col h-full min-h-[500px]">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="text-yellow-500" size={20} /> Ordens de Serviço
      </h3>
      <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
        {requests.map((item) => (
          <div key={item.id} onClick={() => onTicketClick(item)}
            className="flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg cursor-pointer border border-transparent hover:border-slate-700 group">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${item.status === 'NEW' || item.status === 'IN_PROGRESS' || item.status === 'ASSIGNED' ? 'bg-red-500' : item.status === 'WAITING_CLIENT' ? 'bg-yellow-500' : 'bg-green-500'}`} />
              <div>
                <h4 className="text-sm font-medium text-white group-hover:text-yellow-400">{item.title}</h4>
                <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10} /> {item.client}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500">{format(new Date(item.date), 'HH:mm')}</span>
              <span className="text-[10px] text-slate-600 bg-slate-900 px-1.5 rounded mt-1">#{item.ticketNumber.split('-')[2]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReservationsList = () => (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 h-full min-h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <CalendarClock className="text-blue-500" size={20} /> Solicitações
        </h2>
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs border border-yellow-500/20">
            {reservations.filter(r => r.status === 'PENDING').length} Pendentes
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
        {reservations.length > 0 ? (
          reservations.map((reservation) => (
            <div key={reservation.id} className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500"><CalendarClock size={20} /></div>
                  <div>
                    <h3 className="text-white font-medium text-sm">{reservation.stockItem?.name || 'Item'}</h3>
                    <p className="text-slate-400 text-xs">{reservation.userName}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {reservation.status === 'PENDING' && (
                  <>
                    <button onClick={() => handleApproveReservation(Number(reservation.id))} className="bg-green-600 text-white py-1.5 rounded-lg text-xs">Aprovar</button>
                    <button onClick={() => handleRejectReservation(Number(reservation.id))} className="bg-red-600/10 text-red-400 border border-red-600/20 py-1.5 rounded-lg text-xs">Rejeitar</button>
                  </>
                )}
                <button onClick={() => handleOpenChat(reservation)} className={`col-span-2 bg-blue-600/10 text-blue-400 border border-blue-600/20 py-1.5 rounded-lg text-xs`}>Conversar</button>
              </div>
            </div>
          ))
        ) : <p className="text-slate-500 text-center mt-10">Nenhuma solicitação.</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      {/* Header & New Order Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Painel Elétrica</h2>
          <p className="text-slate-400 hidden md:block">Monitoramento de ordens de serviço e manutenção predial</p>
        </div>
        <button
          onClick={() => setIsNewOrderModalOpen(true)}
          className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-yellow-500/20"
        >
          <Plus size={20} /> <span className="hidden sm:inline">Nova Ordem</span>
        </button>
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden md:grid gap-6">
        <div className="grid grid-cols-4 gap-4">{renderMetrics().props.children}</div>
        {renderSchedule()}
        {renderChart()}
        <div className="grid grid-cols-2 gap-6">
          {renderTicketsList()}
          {renderReservationsList()}
        </div>
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden space-y-6">
        {mobileTab === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {renderMetrics()}
            {renderSchedule()}
            {renderChart()}
          </motion.div>
        )}

        {mobileTab === 'tickets' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-200px)]">
            {renderTicketsList()}
          </motion.div>
        )}

        {mobileTab === 'reservations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-200px)]">
            {renderReservationsList()}
          </motion.div>
        )}

        {mobileTab === 'schedule' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-200px)] flex flex-col gap-4">
            {renderSchedule()}
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
              <p className="text-slate-400 text-sm text-center">Visualização completa do cronograma disponível em Desktop.</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* MOBILE FLOATING MENU */}
      <MobileFloatingMenu
        activeId={mobileTab}
        onSelect={setMobileTab}
        items={[
          { id: 'home', icon: LayoutDashboard, label: 'Visão Geral', badge: badges.home },
          { id: 'tickets', icon: ListTodo, label: 'Tickets', badge: badges.tickets },
          { id: 'reservations', icon: CalendarClock, label: 'Reservas', badge: badges.reservations },
          { id: 'schedule', icon: Clock, label: 'Agenda' },
        ]}
      />

      {/* Modal Nova Ordem de Serviço */}
      <AnimatePresence>
        {isNewOrderModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={() => setIsNewOrderModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Zap className="text-yellow-500" /> Nova Ordem</h3>
                <button onClick={() => setIsNewOrderModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Local</label>
                    <input type="text" placeholder="Ex: Sala 302" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white outline-none" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Prioridade</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white outline-none"><option value="normal">Normal</option><option value="high">Alta</option></select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Título</label>
                  <input type="text" placeholder="Ex: Troca de disjuntor" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-white outline-none" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Descrição</label>
                  <textarea rows={3} placeholder="Descreva o problema..." className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white outline-none resize-none" required />
                </div>
                <button type="submit" className="w-full py-3 bg-yellow-500 text-black rounded-xl font-bold mt-2">Criar Ordem</button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reservation Chat Drawer */}
      {activeReservationChat && (
        <ReservationChat
          isOpen={!!activeReservationChat}
          onClose={() => setActiveReservationChat(null)}
          requesterName={activeReservationChat.requester}
          assetName={activeReservationChat.assetName}
          reservationId={activeReservationChat.id}
        />
      )}
    </div>
  );
}
