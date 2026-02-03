interface TicketItemProps {
  category: string;
  title: string;
  date: string;
  status: 'OPEN' | 'CLOSED' | 'WAITING' | 'IN_PROGRESS';
  onClick?: () => void;
}

const statusConfig = {
  OPEN: { label: 'ABERTO', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  CLOSED: { label: 'FECHADO', color: 'bg-slate-600/20 text-slate-400 border-slate-600/30' },
  WAITING: { label: 'AGUARDANDO', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  IN_PROGRESS: { label: 'EM ANDAMENTO', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

export default function TicketItem({ category, title, date, status, onClick }: TicketItemProps) {
  const statusInfo = statusConfig[status] || { label: status || 'DESCONHECIDO', color: 'bg-slate-600/20 text-slate-400 border-slate-600/30' };

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-600/50 transition-all cursor-pointer group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-blue-400 text-xs font-medium">[{category}]</span>
          <span className="text-slate-300 text-sm truncate">{title}</span>
        </div>
        <div className="text-slate-500 text-xs">{date}</div>
      </div>
      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color} whitespace-nowrap ml-4`}>
        {statusInfo.label}
      </div>
    </div>
  );
}