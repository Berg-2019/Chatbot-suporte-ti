import { ArrowLeft, Phone, Video, MoreVertical, User } from 'lucide-react';
import { Ticket } from '@/app/services/api';

interface MobileChatHeaderProps {
  ticket: Ticket;
  onBack: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onMoreOptions?: () => void;
}

export default function MobileChatHeader({
  ticket,
  onBack,
  onCall,
  onVideoCall,
  onMoreOptions,
}: MobileChatHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 border-b"
      style={{
        backgroundColor: 'var(--cw-bg-sidebar)',
        borderColor: 'var(--cw-border)',
      }}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Back button */}
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full transition-colors active:bg-slate-700"
        >
          <ArrowLeft size={24} style={{ color: 'var(--cw-text-primary)' }} />
        </button>

        {/* Contact info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--cw-accent)' }}
          >
            <User size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-base font-semibold truncate"
              style={{ color: 'var(--cw-text-primary)' }}
            >
              {ticket.customerName || 'Cliente'}
            </h2>
            <p
              className="text-xs truncate"
              style={{ color: 'var(--cw-text-tertiary)' }}
            >
              {ticket.phoneNumber || 'Sem telefone'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {onVideoCall && (
            <button
              onClick={onVideoCall}
              className="p-2 rounded-full transition-colors active:bg-slate-700"
              title="Videochamada"
            >
              <Video size={22} style={{ color: 'var(--cw-text-primary)' }} />
            </button>
          )}
          {onCall && (
            <button
              onClick={onCall}
              className="p-2 rounded-full transition-colors active:bg-slate-700"
              title="Ligar"
            >
              <Phone size={22} style={{ color: 'var(--cw-text-primary)' }} />
            </button>
          )}
          {onMoreOptions && (
            <button
              onClick={onMoreOptions}
              className="p-2 rounded-full transition-colors active:bg-slate-700"
              title="Mais opções"
            >
              <MoreVertical size={22} style={{ color: 'var(--cw-text-primary)' }} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
