import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Circle, Check } from 'lucide-react';
import type { AgentStatus } from './StatusBadge';

interface StatusSelectorProps {
  currentStatus: AgentStatus;
  onStatusChange: (status: AgentStatus) => void;
}

const statusOptions: Array<{ value: AgentStatus; label: string; color: string }> = [
  { value: 'ONLINE', label: 'Online', color: 'bg-green-500' },
  { value: 'BUSY', label: 'Ocupado', color: 'bg-red-500' },
  { value: 'IN_SERVICE', label: 'Em Atendimento', color: 'bg-blue-500' },
  { value: 'IDLE', label: 'Ausente', color: 'bg-yellow-500' },
  { value: 'OFFLINE', label: 'Offline', color: 'bg-slate-500' },
];

export default function StatusSelector({ currentStatus, onStatusChange }: StatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = statusOptions.find(opt => opt.value === currentStatus) || statusOptions[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (status: AgentStatus) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg transition-colors"
      >
        <Circle className={`w-2.5 h-2.5 ${currentOption.color} fill-current`} />
        <span className="text-sm text-slate-200">{currentOption.label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Circle className={`w-2.5 h-2.5 ${option.color} fill-current`} />
                <span className="text-sm text-slate-200">{option.label}</span>
              </div>
              {currentStatus === option.value && (
                <Check className="w-4 h-4 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
