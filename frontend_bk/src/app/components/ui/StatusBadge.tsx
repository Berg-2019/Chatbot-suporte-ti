import { Circle } from 'lucide-react';

export type AgentStatus = 'ONLINE' | 'BUSY' | 'IN_SERVICE' | 'IDLE' | 'OFFLINE';

interface StatusBadgeProps {
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  ONLINE: {
    label: 'Online',
    color: 'bg-green-500',
    textColor: 'text-green-500',
    borderColor: 'border-green-500/20',
    bgColor: 'bg-green-500/10',
  },
  BUSY: {
    label: 'Ocupado',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    borderColor: 'border-red-500/20',
    bgColor: 'bg-red-500/10',
  },
  IN_SERVICE: {
    label: 'Em Atendimento',
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/10',
  },
  IDLE: {
    label: 'Ausente',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/20',
    bgColor: 'bg-yellow-500/10',
  },
  OFFLINE: {
    label: 'Offline',
    color: 'bg-slate-500',
    textColor: 'text-slate-500',
    borderColor: 'border-slate-500/20',
    bgColor: 'bg-slate-500/10',
  },
};

const sizeConfig = {
  sm: {
    dot: 'w-2 h-2',
    text: 'text-xs',
    padding: 'px-2 py-0.5',
  },
  md: {
    dot: 'w-2.5 h-2.5',
    text: 'text-sm',
    padding: 'px-2.5 py-1',
  },
  lg: {
    dot: 'w-3 h-3',
    text: 'text-base',
    padding: 'px-3 py-1.5',
  },
};

export default function StatusBadge({
  status,
  size = 'md',
  showLabel = true,
  className = '',
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];

  if (!showLabel) {
    return (
      <div className={`relative ${className}`}>
        <div
          className={`${sizeStyles.dot} ${config.color} rounded-full ${status === 'ONLINE' ? 'animate-pulse' : ''}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.borderColor} ${config.bgColor} ${sizeStyles.padding} ${className}`}
    >
      <Circle
        className={`${sizeStyles.dot} ${config.color} fill-current ${status === 'ONLINE' ? 'animate-pulse' : ''}`}
      />
      <span className={`${sizeStyles.text} ${config.textColor} font-medium`}>
        {config.label}
      </span>
    </div>
  );
}
