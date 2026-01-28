import { LucideIcon } from 'lucide-react';

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  color: string;
  onClick?: () => void;
}

export default function QuickAction({ 
  icon: Icon, 
  label, 
  color,
  onClick 
}: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-6 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800 transition-all group"
    >
      <div className={`p-4 rounded-xl ${color} group-hover:scale-110 transition-transform`}>
        <Icon size={28} className="text-white" />
      </div>
      <span className="text-slate-300 text-sm font-medium">{label}</span>
    </button>
  );
}
