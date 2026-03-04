import { useState, useEffect, useCallback, useRef } from 'react';
import { Filter, ArrowDownUp, MoreVertical, Search } from 'lucide-react';
import { ticketsApi, type Ticket } from '@/app/services/api';
import { useAuth } from '@/app/context/AuthContext';
import { playNotificationSound } from '@/app/utils/sound';
import { toast } from 'sonner';

interface ConversationListPanelProps {
    onTicketClick: (ticket: Ticket) => void;
    selectedTicketId: string | null;
    refreshTrigger?: number;
}

type TabType = 'mine' | 'unassigned' | 'all' | 'closed';

export default function ConversationListPanel({ onTicketClick, selectedTicketId, refreshTrigger }: ConversationListPanelProps) {
    const { user, profile } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('mine');
    const [searchQuery, setSearchQuery] = useState('');
    const previousTicketIdsRef = useRef<Set<string>>(new Set());

    const [panelWidth, setPanelWidth] = useState(340);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const resizerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const resizer = resizerRef.current;
        if (!resizer) return;

        let isResizing = false;

        const startResize = (e: MouseEvent) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        };

        const stopResize = () => {
            isResizing = false;
            document.body.style.cursor = 'default';
        };

        const resize = (e: MouseEvent) => {
            if (!isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < 280) newWidth = 280;
            if (newWidth > 600) newWidth = 600;
            setPanelWidth(newWidth);
        };

        resizer.addEventListener('mousedown', startResize);
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);

        return () => {
            resizer.removeEventListener('mousedown', startResize);
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResize);
        };
    }, []);

    const fetchTickets = useCallback(async (isAutoRefresh = false) => {
        if (isAutoRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await ticketsApi.getAll({});
            const newTickets = response.tickets.filter(t => {
                const cat = (t.category || '').toLowerCase();
                const sec = (t.sector || '').toLowerCase();
                if (profile === 'tech_elect') {
                    return cat.includes('elétrica') || cat.includes('eletrica') ||
                        sec.includes('elétrica') || sec.includes('eletrica');
                }
                return !cat.includes('elétrica') && !cat.includes('eletrica') &&
                    !sec.includes('elétrica') && !sec.includes('eletrica');
            });

            if (isAutoRefresh && newTickets.length > 0) {
                const hasNewTickets = newTickets.some(t => !previousTicketIdsRef.current.has(t.id));
                if (hasNewTickets) {
                    playNotificationSound();
                }
                previousTicketIdsRef.current = new Set(newTickets.map(t => t.id));
            } else if (!isAutoRefresh) {
                previousTicketIdsRef.current = new Set(newTickets.map(t => t.id));
            }

            setTickets(newTickets);
        } catch (error) {
            console.error('Erro ao buscar tickets:', error);
            if (!isAutoRefresh) toast.error('Erro ao carregar conversas');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [profile]);

    useEffect(() => {
        fetchTickets();
        const intervalId = setInterval(() => fetchTickets(true), 30000);
        return () => clearInterval(intervalId);
    }, [fetchTickets, refreshTrigger]);

    // Filter tickets by tab
    const myTickets = tickets.filter(t => t.technician === user?.email && t.status !== 'CLOSED');
    const unassignedTickets = tickets.filter(t => !t.technician && t.status !== 'CLOSED');
    const allOpenTickets = tickets.filter(t => t.status !== 'CLOSED');
    const closedTickets = tickets.filter(t => t.status === 'CLOSED');

    const getTabTickets = () => {
        let base: Ticket[];
        switch (activeTab) {
            case 'mine': base = myTickets; break;
            case 'unassigned': base = unassignedTickets; break;
            case 'all': base = allOpenTickets; break;
            case 'closed': base = closedTickets; break;
            default: base = allOpenTickets;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return base.filter(t =>
                (t.title || '').toLowerCase().includes(q) ||
                (t.customerName || t.client || '').toLowerCase().includes(q) ||
                (t.category || '').toLowerCase().includes(q) ||
                (t.ticketNumber || '').toLowerCase().includes(q)
            );
        }
        return base;
    };

    const filteredTickets = getTabTickets();

    const tabs: { id: TabType; label: string; count: number }[] = [
        { id: 'mine', label: 'Minhas', count: myTickets.length },
        { id: 'unassigned', label: 'Não atribuídas', count: unassignedTickets.length },
        { id: 'all', label: 'Todos', count: allOpenTickets.length },
        { id: 'closed', label: 'Fechadas', count: closedTickets.length },
    ];

    const getTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'agora';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    };

    return (
        <div
            className={`flex flex-col border-r h-screen relative group ${isMobile ? 'w-full' : ''}`}
            style={isMobile ? {
                backgroundColor: 'var(--cw-bg-secondary)',
                borderColor: 'var(--cw-border)',
            } : {
                width: `${panelWidth}px`,
                minWidth: '280px',
                maxWidth: '600px',
                backgroundColor: 'var(--cw-bg-secondary)',
                borderColor: 'var(--cw-border)',
            }}
        >
            {/* Handle Resizer */}
            {!isMobile && (
                <div
                    ref={resizerRef}
                    className="absolute top-0 -right-1 w-2 h-full cursor-col-resize z-50 hover:bg-blue-500/50 transition-colors"
                />
            )}

            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* Header */}
            <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid var(--cw-border)' }}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--cw-text-primary)' }}>
                            Conversas
                        </h2>
                        <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                                backgroundColor: activeTab === 'closed' ? 'var(--cw-bg-tertiary)' : 'var(--cw-accent-subtle)',
                                color: activeTab === 'closed' ? 'var(--cw-text-secondary)' : 'var(--cw-accent)',
                            }}
                        >
                            {activeTab === 'closed' ? 'Fechadas' : 'Abertas'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--cw-text-tertiary)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                            <Filter size={16} />
                        </button>
                        <button className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--cw-text-tertiary)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                            <ArrowDownUp size={16} />
                        </button>
                        <button className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--cw-text-tertiary)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                            <MoreVertical size={16} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 overflow-x-auto hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex items-center gap-1.5 px-2 py-2 text-[12px] font-medium transition-all border-b-2 whitespace-nowrap"
                            style={{
                                color: activeTab === tab.id ? 'var(--cw-accent)' : 'var(--cw-text-tertiary)',
                                borderColor: activeTab === tab.id ? 'var(--cw-accent)' : 'transparent',
                            }}
                        >
                            <span>{tab.label}</span>
                            <span
                                className="text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1"
                                style={{
                                    backgroundColor: activeTab === tab.id ? 'var(--cw-accent-subtle)' : 'var(--cw-bg-tertiary)',
                                    color: activeTab === tab.id ? 'var(--cw-accent)' : 'var(--cw-text-tertiary)',
                                }}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--cw-border)' }}>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--cw-bg-tertiary)' }}>
                    <Search size={14} style={{ color: 'var(--cw-text-tertiary)' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar conversa..."
                        className="flex-1 bg-transparent border-none outline-none text-[13px]"
                        style={{ color: 'var(--cw-text-primary)' }}
                    />
                </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cw-accent)', borderTopColor: 'transparent' }} />
                    </div>
                ) : filteredTickets.length > 0 ? (
                    <>
                        {filteredTickets.map((ticket) => {
                            const isSelected = selectedTicketId === ticket.id;
                            const initials = (ticket.customerName || ticket.client || 'CL').substring(0, 2).toUpperCase();
                            const timeAgo = getTimeAgo(ticket.updatedAt || ticket.createdAt);

                            return (
                                <button
                                    key={ticket.id}
                                    onClick={() => onTicketClick(ticket)}
                                    className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-l-2"
                                    style={{
                                        backgroundColor: isSelected ? 'var(--cw-bg-active)' : 'transparent',
                                        borderLeftColor: isSelected ? 'var(--cw-accent)' : 'transparent',
                                        borderBottom: '1px solid var(--cw-border)',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    {/* Avatar */}
                                    <div
                                        className="w-9 h-9 min-w-[36px] rounded-full flex items-center justify-center text-white text-xs font-semibold mt-0.5"
                                        style={{
                                            background: isSelected
                                                ? 'linear-gradient(135deg, var(--cw-accent), #1A7FE0)'
                                                : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                                        }}
                                    >
                                        {initials}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[13px] font-semibold line-clamp-2 pr-2" style={{ color: 'var(--cw-text-primary)' }}>
                                                {ticket.customerName || ticket.client || 'Cliente'}
                                            </span>
                                            <span className="text-[11px] ml-auto whitespace-nowrap mt-0.5" style={{ color: 'var(--cw-text-tertiary)' }}>
                                                {timeAgo}
                                            </span>
                                        </div>
                                        <p className="text-[12px] line-clamp-2 mb-1" style={{ color: 'var(--cw-text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {ticket.title || ticket.description || 'Sem mensagem'}
                                        </p>
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                                style={{
                                                    backgroundColor: ticket.status === 'NEW' ? 'rgba(59, 130, 246, 0.15)' :
                                                        ticket.status === 'IN_PROGRESS' ? 'rgba(139, 92, 246, 0.15)' :
                                                            ticket.status === 'WAITING_CLIENT' ? 'rgba(234, 179, 8, 0.15)' :
                                                                ticket.status === 'RESOLVED' ? 'rgba(34, 197, 94, 0.15)' :
                                                                    'var(--cw-bg-tertiary)',
                                                    color: ticket.status === 'NEW' ? '#60A5FA' :
                                                        ticket.status === 'IN_PROGRESS' ? '#A78BFA' :
                                                            ticket.status === 'WAITING_CLIENT' ? '#FBBF24' :
                                                                ticket.status === 'RESOLVED' ? '#4ADE80' :
                                                                    'var(--cw-text-tertiary)',
                                                }}
                                            >
                                                {ticket.status === 'NEW' ? 'Novo' :
                                                    ticket.status === 'ASSIGNED' ? 'Atribuído' :
                                                        ticket.status === 'IN_PROGRESS' ? 'Em andamento' :
                                                            ticket.status === 'WAITING_CLIENT' ? 'Aguardando' :
                                                                ticket.status === 'RESOLVED' ? 'Resolvido' :
                                                                    ticket.status === 'CLOSED' ? 'Fechado' : ticket.status}
                                            </span>
                                            {ticket.category && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--cw-bg-tertiary)', color: 'var(--cw-text-tertiary)' }}>
                                                    {ticket.category}
                                                </span>
                                            )}
                                            {ticket.ticketNumber && (
                                                <span className="text-[10px]" style={{ color: 'var(--cw-text-tertiary)' }}>
                                                    #{ticket.ticketNumber.split('-').pop()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}

                        {/* End of list */}
                        <div className="py-4 text-center">
                            <span className="text-[12px]" style={{ color: 'var(--cw-text-tertiary)' }}>
                                Todas as conversas carregadas 🎉
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                        <p className="text-sm" style={{ color: 'var(--cw-text-tertiary)' }}>
                            {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa nesta aba'}
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom indicator */}
            {refreshing && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5">
                    <div className="h-full animate-pulse" style={{ backgroundColor: 'var(--cw-accent)' }} />
                </div>
            )}
        </div>
    );
}
