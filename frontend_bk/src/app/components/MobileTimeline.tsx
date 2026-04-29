import { useState } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, User, Clock, CheckCircle2, XCircle, MessageCircle } from 'lucide-react';

interface TimelineReservation {
  id: number;
  assetId: number;
  assetName: string;
  userName: string;
  startTime: Date;
  endTime: Date;
  status: 'approved' | 'pending';
}

interface MobileTimelineProps {
  reservations: TimelineReservation[];
  onApprove?: (id: number) => void;
  onReject?: (id: number) => void;
  onChat?: (id: number) => void;
}

export default function MobileTimeline({ reservations, onApprove, onReject, onChat }: MobileTimelineProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Ordenar por data
  const sortedReservations = [...reservations].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Agrupar por dia
  const groupedReservations: { [key: string]: TimelineReservation[] } = {};
  sortedReservations.forEach(res => {
    const dayKey = format(res.startTime, 'yyyy-MM-dd');
    if (!groupedReservations[dayKey]) {
      groupedReservations[dayKey] = [];
    }
    groupedReservations[dayKey].push(res);
  });

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 pb-20">
      {Object.keys(groupedReservations).length === 0 && (
         <div className="text-center py-10 text-slate-500">
           Nenhuma reserva agendada.
         </div>
      )}

      {Object.entries(groupedReservations).map(([dateKey, daysReservations]) => {
        const date = parseISO(dateKey);
        const isToday = isSameDay(date, new Date());

        return (
          <div key={dateKey} className="space-y-2">
            {/* Date Header */}
            <div className={`sticky top-0 z-10 py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-between backdrop-blur-md border-b
              ${isToday ? 'bg-blue-900/30 text-blue-200 border-blue-800' : 'bg-slate-900/80 text-slate-400 border-slate-800'}
            `}>
              <span>{format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
              {isToday && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">HOJE</span>}
            </div>

            {/* Reservations List */}
            <div className="space-y-2 px-1">
              {daysReservations.map((res) => {
                const isExpanded = expandedId === res.id;
                
                return (
                  <motion.div 
                    key={res.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`
                      overflow-hidden rounded-xl border transition-colors
                      ${isExpanded 
                        ? 'bg-slate-800 border-slate-600 shadow-lg' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'}
                    `}
                  >
                    {/* Compact View (Always Visible) */}
                    <div 
                      onClick={() => toggleExpand(res.id)}
                      className="p-3 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-1.5 h-10 rounded-full shrink-0 ${res.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        <div className="min-w-0">
                           <h4 className={`text-sm font-medium truncate ${isExpanded ? 'text-white' : 'text-slate-300'}`}>
                             {res.assetName}
                           </h4>
                           <p className="text-xs text-slate-500 flex items-center gap-1">
                             <Clock size={10} />
                             {format(res.startTime, 'HH:mm')} - {format(res.endTime, 'HH:mm')}
                           </p>
                        </div>
                      </div>
                      <div className="text-slate-500">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-700/50 bg-slate-800/50"
                        >
                          <div className="p-4 space-y-4">
                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
                               <div className="space-y-1">
                                  <span className="block font-medium text-slate-500">Solicitante</span>
                                  <div className="flex items-center gap-1.5 text-slate-200">
                                    <User size={14} /> {res.userName}
                                  </div>
                               </div>
                               <div className="space-y-1">
                                  <span className="block font-medium text-slate-500">Status</span>
                                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                                     res.status === 'approved' 
                                       ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                       : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                  }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${res.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                    {res.status === 'approved' ? 'Aprovado' : 'Pendente'}
                                  </div>
                               </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                               {res.status === 'pending' && onApprove && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); onApprove(res.id); }}
                                   className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
                                 >
                                   <CheckCircle2 size={14} /> Aprovar
                                 </button>
                               )}
                               {res.status === 'pending' && onReject && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); onReject(res.id); }}
                                   className="flex-1 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
                                 >
                                   <XCircle size={14} /> Rejeitar
                                 </button>
                               )}
                               <button 
                                 onClick={(e) => { e.stopPropagation(); onChat && onChat(res.id); }}
                                 className={`
                                   ${res.status === 'pending' ? 'w-auto px-3' : 'flex-1'}
                                   bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/20 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2
                                 `}
                               >
                                 <MessageCircle size={14} /> {res.status === 'pending' ? '' : 'Conversar'}
                               </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
