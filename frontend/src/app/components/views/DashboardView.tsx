import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import MetricCard from '../MetricCard';
import TicketItem from '../TicketItem';
import ReservationChat from '../ReservationChat';
import MobileFloatingMenu from '../MobileFloatingMenu';
import {
  FolderOpen,
  Calendar,
  Clock,
  Timer,
  Headphones,
  Printer as PrinterIcon,
  Zap,
  RefreshCw,
  UserCheck,
  ListVideo,
  CheckCircle2,
  CalendarClock,
  XCircle,
  MessageCircle,
  Clock as ClockIcon,
  LayoutDashboard,
  ListTodo
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBadges } from '../../hooks/useBadges';
import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { reservationApi, ticketsApi, printerApi, type Reservation as ApiReservation, type Ticket, type Printer } from '../../services/api';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Reservation {
  id: number;
  assetName: string;
  requester: string;
  dateStart: string;
  dateEnd: string;
  status: 'pending' | 'approved' | 'active' | 'completed';
}

interface DashboardViewProps {
  onTicketClick: (ticket: Ticket) => void;
  refreshTrigger?: number;
}

export default function DashboardView({ onTicketClick, refreshTrigger }: DashboardViewProps) {
  const { profile, user } = useAuth();
  const badges = useBadges(); // Hook de badges
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeReservationChat, setActiveReservationChat] = useState<{ requester: string, assetName: string, id: number } | null>(null);

  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printersLoading, setPrintersLoading] = useState(false);

  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState('home');

  const isTechnician = profile === 'tech_elect'; // NOTE: Assuming this matches existing logic, but usually tech_ti would also be technician.

  // Reservations from API
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);

  const metrics = [
    { icon: FolderOpen, value: tickets.filter(t => t.status !== 'CLOSED').length, label: 'Tickets', sublabel: 'Abertos', iconColor: 'bg-yellow-600' },
    { icon: Calendar, value: tickets.filter(t => t.date && parseISO(t.date).getDate() === new Date().getDate()).length, label: 'Novos', sublabel: 'Hoje', iconColor: 'bg-blue-600' },
    { icon: Clock, value: tickets.filter(t => t.status === 'WAITING_CLIENT').length, label: 'Aguardando', sublabel: '', iconColor: 'bg-orange-600' },
    { icon: Timer, value: '45min', label: 'Tempo', sublabel: 'Médio', iconColor: 'bg-purple-600' },
  ];

  // Fetch Reservations from API
  const fetchReservations = useCallback(async () => {
    setReservationsLoading(true);
    try {
      const data = await reservationApi.getAll({ status: 'PENDING' });
      // Also get approved ones
      const approved = await reservationApi.getAll({ status: 'APPROVED' });
      setReservations([...data, ...approved.slice(0, 5)]);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setReservationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile === 'admin') {
      fetchReservations();
    }
  }, [profile, fetchReservations, refreshTrigger]);

  const handleApproveReservation = async (id: string) => {
    try {
      await reservationApi.approve(id);
      toast.success('Reserva aprovada com sucesso!');
      fetchReservations();
    } catch (err) {
      toast.error('Erro ao aprovar reserva');
    }
  };

  const handleRejectReservation = async (id: string) => {
    try {
      await reservationApi.reject(id);
      toast.error('Reserva rejeitada/cancelada.');
      fetchReservations();
    } catch (err) {
      toast.error('Erro ao rejeitar reserva');
    }
  };

  const handleOpenChat = (reservation: ApiReservation) => {
    setActiveReservationChat({
      requester: reservation.userName,
      assetName: reservation.stockItem?.name || 'Item',
      id: parseInt(reservation.id) || 0
    });
  };

  const fetchPrinters = useCallback(async () => {
    setPrintersLoading(true);
    try {
      const data = await printerApi.getAllStatus();
      setPrinters(data || []);
    } catch (error) {
      // Silently handle error - just show empty printers
      console.error('Error fetching printers:', error);
      setPrinters([]);
    } finally {
      setPrintersLoading(false);
    }
  }, []);

  const fetchTickets = async (isAutoRefresh = false) => {
    if (isAutoRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await ticketsApi.getAll();
      setTickets(response.tickets);
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      toast.error('Erro ao atualizar tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchPrinters();
    const intervalId = setInterval(() => {
      fetchTickets(true);
      fetchPrinters(); // Refresh printers too
    }, 30000);
    return () => clearInterval(intervalId);
  }, [fetchPrinters, refreshTrigger]);

  const myTickets = tickets.filter(t => t.technician === user?.email && t.status !== 'CLOSED');
  const queueTickets = tickets.filter(t => !t.technician && t.status !== 'CLOSED');

  // RENDER FUNCTIONS
  const renderMetrics = () => (
    <>
      {!isTechnician ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
          {profile === 'admin' && (
            <MetricCard
              icon={Zap}
              value="4"
              label="Elétrica"
              sublabel="Atenção"
              iconColor="bg-yellow-500"
              trend="+1"
              trendUp={false}
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="bg-blue-600/20 p-3 rounded-lg text-blue-500"><Headphones size={24} /></div>
            <div><div className="text-2xl font-bold text-white">{myTickets.length}</div><div className="text-sm text-slate-400">Em Atendimento</div></div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="bg-orange-600/20 p-3 rounded-lg text-orange-500"><ListVideo size={24} /></div>
            <div><div className="text-2xl font-bold text-white">{queueTickets.length}</div><div className="text-sm text-slate-400">Na Fila</div></div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="bg-green-600/20 p-3 rounded-lg text-green-500"><CheckCircle2 size={24} /></div>
            <div><div className="text-2xl font-bold text-white">5</div><div className="text-sm text-slate-400">Finalizados Hoje</div></div>
          </div>
        </div>
      )}
    </>
  );

  const renderPrinters = () => (
    !isTechnician && (
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Status das Impressoras</h2>
          <button className="text-blue-400 hover:text-blue-300 text-sm" onClick={fetchPrinters}>Atualizar</button>
        </div>
        <div className="mx-[-0.5rem] px-2">
          {printersLoading && printers.length === 0 ? (
            <div className="text-center py-4 text-slate-500">Carregando impressoras...</div>
          ) : printers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <PrinterIcon className="mx-auto mb-2 opacity-50" size={32} />
              <p className="text-sm">Nenhuma impressora cadastrada</p>
              <p className="text-xs text-slate-600 mt-1">Cadastre impressoras no painel de administração</p>
            </div>
          ) : (
            <Slider {...{ dots: false, infinite: false, speed: 500, slidesToShow: 4, slidesToScroll: 1, arrows: true, responsive: [{ breakpoint: 1280, settings: { slidesToShow: 3 } }, { breakpoint: 1024, settings: { slidesToShow: 2 } }, { breakpoint: 640, settings: { slidesToShow: 1 } }] }}>
              {printers.map((printer, index) => {
                const inkLevel = printer.status?.tonerBlack ?? 0;
                const isOnline = printer.status?.online ?? false;

                return (
                  <div key={printer.id || index} className="px-2">
                    <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <PrinterIcon className={`${isOnline ? 'text-green-500' : 'text-red-500'}`} size={20} />
                          <h3 className="text-white font-medium text-xs truncate max-w-[120px]" title={printer.name}>{printer.name}</h3>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 space-y-1"><div className="h-1.5 bg-slate-700 rounded-full overflow-hidden w-full"><div className={`h-full ${inkLevel < 20 ? 'bg-red-500' : inkLevel < 40 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${inkLevel}%` }} /></div></div>
                        <span className={`text-xs font-semibold ${inkLevel < 20 ? 'text-red-400' : inkLevel < 40 ? 'text-yellow-400' : 'text-green-400'}`}>{inkLevel}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </Slider>
          )}
        </div>
      </div>
    )
  );

  const renderTicketsList = () => (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Todos os Tickets</h2>
        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">{tickets.length} itens</span>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm">Carregando tickets...</p>
          </div>
        ) : tickets.length > 0 ? (
          tickets.map((ticket, index) => (
            <TicketItem key={ticket.id || index} {...ticket} onClick={() => onTicketClick(ticket)} />
          ))
        ) : <div className="text-center py-10 text-slate-500">Nenhum ticket encontrado</div>}
      </div>
    </div>
  );

  const renderQueueList = () => (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2"><ListVideo size={20} className="text-slate-400" /> Fila de Espera</h2>
        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full">{queueTickets.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {queueTickets.length > 0 ? queueTickets.map(ticket => (
          <TicketItem key={ticket.id} {...ticket} onClick={() => onTicketClick(ticket)} showAssignButton />
        )) : <div className="text-center py-10 text-slate-500">Fila limpa!</div>}
      </div>
    </div>
  );

  const renderMyTicketsList = () => (
    <div className="bg-blue-900/10 border border-blue-900/30 rounded-2xl p-6 h-full flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2"><UserCheck size={20} className="text-blue-400" /> Meus Atendimentos</h2>
        <span className="text-xs bg-blue-900/50 text-blue-200 border border-blue-800 px-2 py-1 rounded-full">{myTickets.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {myTickets.length > 0 ? myTickets.map(ticket => (
          <TicketItem key={ticket.id} {...ticket} onClick={() => onTicketClick(ticket)} isActive />
        )) : <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4"><Headphones size={48} className="text-slate-700" /><p>Você não tem atendimentos ativos.</p></div>}
      </div>
    </div>
  );

  const renderReservationsList = () => (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2"><CalendarClock className="text-blue-500" size={24} /> Solicitações</h2>
        <div className="flex gap-2"><span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs border border-yellow-500/20">{reservations.filter(r => r.status === 'PENDING').length} Pendentes</span></div>
      </div>
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
        {reservationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reservations.length > 0 ? (
          reservations.map((reservation) => (
            <div key={reservation.id} className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 transition-colors hover:border-slate-600/50">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${reservation.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' : reservation.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' : 'bg-slate-700 text-slate-400'}`}><CalendarClock size={20} /></div>
                  <div>
                    <h3 className="text-white font-medium">{reservation.stockItem?.name || 'Item'}</h3>
                    <p className="text-slate-400 text-sm">{reservation.userName} {reservation.userSector ? `(${reservation.userSector})` : ''}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${reservation.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : reservation.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                  {reservation.status === 'PENDING' ? 'Pendente' : reservation.status === 'APPROVED' ? 'Aprovado' : reservation.status === 'IN_USE' ? 'Em Uso' : 'Concluído'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mb-3">
                {format(parseISO(reservation.startTime), "dd/MM 'às' HH:mm", { locale: ptBR })} → {format(parseISO(reservation.endTime), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {reservation.status === 'PENDING' && (
                  <>
                    <button onClick={() => handleApproveReservation(reservation.id)} className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm">Aprovar</button>
                    <button onClick={() => handleRejectReservation(reservation.id)} className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 py-2 rounded-lg text-sm">Rejeitar</button>
                  </>
                )}
                <button onClick={() => handleOpenChat(reservation)} className={`${reservation.status === 'PENDING' ? 'col-span-2' : 'col-span-2'} bg-blue-600/10 text-blue-400 border border-blue-600/20 py-2 rounded-lg text-sm`}>Conversar</button>
              </div>
            </div>
          ))
        ) : <div className="text-center p-4 text-slate-500">Nenhuma solicitação.</div>}
      </div>
    </div>
  );

  const technicianMenuItems = [
    { id: 'home', icon: LayoutDashboard, label: 'Visão Geral', badge: badges.home },
    { id: 'queue', icon: ListVideo, label: 'Fila', badge: badges.queue },
    { id: 'mytickets', icon: UserCheck, label: 'Meus Tickets', badge: 0 },
  ];

  const adminMenuItems = [
    { id: 'home', icon: LayoutDashboard, label: 'Visão Geral', badge: badges.home },
    { id: 'tickets', icon: ListTodo, label: 'Tickets', badge: badges.tickets },
    { id: 'reservations', icon: CalendarClock, label: 'Reservas', badge: badges.reservations },
  ];

  return (
    <div className="pb-24 md:pb-0">
      {/* Header - Hidden on mobile */}
      <div className="mb-8 hidden lg:flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-white">Bem-vindo, {user?.name || (profile === 'admin' ? 'Administrador' : 'Técnico')}!</h1>
            <span className="text-2xl">👋</span>
          </div>
          <p className="text-slate-400">{isTechnician ? 'Painel Operacional de Atendimento' : 'Visão geral do sistema de helpdesk'}</p>
        </div>
        <div className="flex gap-2">
          {refreshing && <span className="text-xs text-slate-500 animate-pulse self-center mr-2">Atualizando...</span>}
          <button onClick={() => fetchTickets(true)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors" title="Atualizar Tickets">
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* DESKTOP VIEW */}
      <div className="hidden md:block">
        {renderMetrics()}
        {renderPrinters()}
        <div className={`grid grid-cols-1 ${isTechnician ? 'lg:grid-cols-2' : 'lg:grid-cols-2'} gap-6 lg:gap-8`}>
          {isTechnician ? (
            <>
              {renderQueueList()}
              {renderMyTicketsList()}
            </>
          ) : (
            <>
              {renderReservationsList()}
              {renderTicketsList()}
            </>
          )}
        </div>
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden space-y-6">
        {mobileTab === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {renderMetrics()}
            {renderPrinters()}
          </motion.div>
        )}

        {isTechnician && mobileTab === 'queue' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-200px)]">
            {renderQueueList()}
          </motion.div>
        )}

        {isTechnician && mobileTab === 'mytickets' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-200px)]">
            {renderMyTicketsList()}
          </motion.div>
        )}

        {!isTechnician && mobileTab === 'tickets' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-200px)]">
            {renderTicketsList()}
          </motion.div>
        )}

        {!isTechnician && mobileTab === 'reservations' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-200px)]">
            {renderReservationsList()}
          </motion.div>
        )}
      </div>

      <MobileFloatingMenu
        activeId={mobileTab}
        onSelect={setMobileTab}
        items={isTechnician ? technicianMenuItems : adminMenuItems}
      />

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
