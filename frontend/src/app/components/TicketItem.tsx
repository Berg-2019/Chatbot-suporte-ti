import { UserPlus, Check } from 'lucide-react';

interface TicketItemProps {
  category: string;
  title: string;
  date: string;
  status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
  onClick?: () => void;
  showAssignButton?: boolean;
  isActive?: boolean;
  ticketNumber?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  NEW: { label: 'NOVO', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ASSIGNED: { label: 'ATRIBUÍDO', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  IN_PROGRESS: { label: 'EM ANDAMENTO', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  WAITING_CLIENT: { label: 'AGUARDANDO', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  RESOLVED: { label: 'RESOLVIDO', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  CLOSED: { label: 'FECHADO', color: 'bg-slate-600/20 text-slate-400 border-slate-600/30' },
};

export default function TicketItem({ category, title, date, status, onClick, showAssignButton, isActive, ticketNumber }: TicketItemProps) {
  const statusInfo = statusConfig[status] || { label: status || 'DESCONHECIDO', color: 'bg-slate-600/20 text-slate-400 border-slate-600/30' };

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer group
        ${isActive ? 'bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/30' : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-600/50'}
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`${isActive ? 'text-blue-200' : 'text-blue-400'} text-xs font-medium`}>[{category}]</span>
          {ticketNumber && <span className="text-[10px] px-1.5 rounded bg-slate-700 text-slate-300">#{ticketNumber.split('-').pop()}</span>}
          <span className={`text-sm truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>{title}</span>
        </div>
        <div className={`${isActive ? 'text-blue-300' : 'text-slate-500'} text-xs flex items-center gap-2`}>
          <span>{date}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color} whitespace-nowrap ml-4`}>
          {statusInfo.label}
        </div>

        {showAssignButton && (
          <button className="p-1.5 rounded-lg bg-slate-700 hover:bg-blue-600 text-slate-400 hover:text-white transition-colors ml-2" title="Assumir">
            <UserPlus size={14} />
          </button>
        )}
      </div>
    </div>
  );
}