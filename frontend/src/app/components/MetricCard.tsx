import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  sublabel?: string;
  iconColor: string;
  trend?: string;
  trendUp?: boolean;
}

export default function MetricCard({ 
  icon: Icon, 
  value, 
  label, 
  sublabel,
  iconColor,
  trend,
  trendUp
}: MetricCardProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Ícone alinhado na esquerda */}
        <div className={`flex items-center justify-center p-2 rounded-lg ${iconColor} shrink-0 shadow-lg shadow-black/20`}>
          <Icon size={18} className="text-white" />
        </div>
        
        {/* Conteúdo de texto à direita */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400 font-medium truncate">{label}</span>
            {trend && (
              <span className={`text-[10px] font-bold ml-1 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
                {trend}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-bold text-white leading-none tracking-tight">{value}</span>
            {sublabel && (
              <span className="text-slate-500 text-[10px] truncate leading-none">{sublabel}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
