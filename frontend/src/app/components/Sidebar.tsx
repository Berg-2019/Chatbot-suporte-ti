import {
  BarChart3,
  Bot,
  FileText,
  HelpCircle,
  Package,
  Users,
  MessageSquare,
  Menu,
  X,
  Printer,
  Briefcase,
  Webhook,
  Shield,
  Search,
  Settings,
  Sun,
  Moon,
  LogOut,
  Inbox,
  Zap,
  ChevronDown,
  ChevronRight,
  Edit3,
  AtSign,
  UsersRound,
  Tag,
  Timer
} from 'lucide-react';
import { useState } from 'react';
import { useAuth, UserProfile } from '@/app/context/AuthContext';
import { useBadges } from '@/app/hooks/useBadges';
import { useTheme } from '@/app/context/ThemeContext';

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: UserProfile[];
  children?: MenuItem[];
}

// Chatwoot-style menu structure
const menuStructure: MenuItem[] = [
  {
    id: 'dashboard', label: 'Minha Caixa', icon: Inbox,
    roles: ['admin', 'tech_ti', 'tech_elect', 'manager'],
  },
  {
    id: 'conversations-group', label: 'Conversas', icon: MessageSquare,
    roles: ['admin', 'tech_ti', 'tech_elect', 'manager'],
    children: [
      { id: 'dashboard', label: 'Todas', icon: MessageSquare, roles: ['admin', 'tech_ti', 'tech_elect', 'manager'] },
      { id: 'mentions', label: 'Menções', icon: AtSign, roles: ['admin', 'tech_ti', 'tech_elect', 'manager'] },
    ]
  },
  {
    id: 'bot', label: 'Bot IA', icon: Bot,
    roles: ['admin', 'tech_ti'],
  },
  {
    id: 'usuarios', label: 'Contatos', icon: Users,
    roles: ['admin', 'manager', 'tech_elect'],
  },
  {
    id: 'reports-group', label: 'Relatórios', icon: BarChart3,
    roles: ['admin', 'tech_ti', 'manager'],
    children: [
      { id: 'metricas', label: 'Visão Geral', icon: BarChart3, roles: ['admin', 'tech_ti'] },
      { id: 'relatorios', label: 'Relatórios', icon: FileText, roles: ['admin', 'tech_ti', 'manager'] },
    ]
  },
  {
    id: 'impressoras', label: 'Impressoras', icon: Printer,
    roles: ['admin', 'tech_ti'],
  },
  {
    id: 'estoque', label: 'Estoque', icon: Package,
    roles: ['admin', 'tech_ti', 'tech_elect'],
  },
  {
    id: 'faq', label: 'FAQ', icon: HelpCircle,
    roles: ['admin', 'tech_ti'],
  },
  {
    id: 'chat', label: 'Chat Equipe', icon: Edit3,
    roles: ['admin', 'tech_ti', 'tech_elect', 'manager'],
  },
  {
    id: 'settings-group', label: 'Configurações', icon: Settings,
    roles: ['admin', 'tech_ti', 'manager'],
    children: [
      { id: 'usuarios', label: 'Agentes', icon: Users, roles: ['admin'] },
      { id: 'gestao', label: 'Gestão', icon: Briefcase, roles: ['admin', 'manager'] },
      { id: 'teams', label: 'Equipes', icon: UsersRound, roles: ['admin'] },
      { id: 'labels', label: 'Labels', icon: Tag, roles: ['admin', 'tech_ti'] },
      { id: 'sla', label: 'SLA', icon: Timer, roles: ['admin'] },
      { id: 'respostas-prontas', label: 'Respostas Prontas', icon: MessageSquare, roles: ['admin', 'tech_ti'] },
      { id: 'webhooks', label: 'Webhooks', icon: Webhook, roles: ['admin'] },
      { id: 'roles', label: 'Roles & Permissões', icon: Shield, roles: ['admin'] },
    ]
  },
];

export default function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, user, logout } = useAuth();
  const badges = useBadges();
  const { theme, toggleTheme } = useTheme();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    menuStructure.forEach(item => {
      if (item.children?.some(child => child.id === activeItem)) {
        initial.add(item.id);
      }
    });
    return initial;
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const canSeeItem = (item: MenuItem): boolean => {
    if (user?.permissions && user.permissions.length > 0) {
      if (item.children) {
        return item.children.some(child => user.permissions!.includes(child.id));
      }
      return user.permissions.includes(item.id);
    }
    return item.roles.includes(profile);
  };

  const getBadgeCount = (id: string) => {
    switch (id) {
      case 'chat': return badges.chat;
      case 'estoque': return badges.stock;
      case 'dashboard': return badges.tickets;
      default: return 0;
    }
  };

  const initials = (user?.name || 'U').substring(0, 1).toUpperCase();
  const isItemActive = (id: string) => activeItem === id;
  const isGroupActive = (item: MenuItem) => item.children?.some(child => child.id === activeItem) || false;

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups.has(item.id);
    const isActive = hasChildren ? isGroupActive(item) : isItemActive(item.id);
    const badgeCount = getBadgeCount(item.id);

    if (!canSeeItem(item)) return null;

    return (
      <div key={item.id}>
        <button
          onClick={() => {
            if (hasChildren) {
              toggleGroup(item.id);
              if (!isExpanded && item.children!.length > 0 && !isGroupActive(item)) {
                const firstVisible = item.children!.find(c => canSeeItem(c));
                if (firstVisible) onItemClick(firstVisible.id);
              }
            } else {
              onItemClick(item.id);
              setIsOpen(false);
            }
          }}
          className={`
            w-full flex items-center justify-between rounded-md text-[13px] transition-all duration-150
            ${isChild ? 'py-1.5 pl-9 pr-3' : 'py-2 px-3'}
          `}
          style={{
            backgroundColor: isActive && !hasChildren ? 'var(--cw-bg-active)' : 'transparent',
            color: isActive ? 'var(--cw-accent)' : 'var(--cw-text-secondary)',
            fontWeight: isActive && !hasChildren ? 500 : 400,
          }}
          onMouseEnter={(e) => {
            if (!isActive || hasChildren) {
              e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)';
              e.currentTarget.style.color = 'var(--cw-text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive || hasChildren) {
              e.currentTarget.style.backgroundColor = isActive && !hasChildren ? 'var(--cw-bg-active)' : 'transparent';
              e.currentTarget.style.color = isActive ? 'var(--cw-accent)' : 'var(--cw-text-secondary)';
            }
          }}
        >
          <div className="flex items-center gap-2">
            <Icon size={isChild ? 14 : 16} />
            <span>{item.label}</span>
          </div>
          <div className="flex items-center gap-1">
            {badgeCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: 'var(--cw-accent)' }}
              >
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
            {hasChildren && (
              isExpanded
                ? <ChevronDown size={13} style={{ color: 'var(--cw-text-tertiary)' }} />
                : <ChevronRight size={13} style={{ color: 'var(--cw-text-tertiary)' }} />
            )}
          </div>
        </button>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {item.children!.filter(child => canSeeItem(child)).map(child => renderMenuItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg shadow-lg"
        style={{ backgroundColor: 'var(--cw-bg-tertiary)', color: 'var(--cw-text-primary)' }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar — adaptive single column */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen flex flex-col z-40 border-r
          transition-all duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          width: 'fit-content',
          minWidth: '200px',
          maxWidth: '260px',
          backgroundColor: 'var(--cw-bg-sidebar)',
          borderColor: 'var(--cw-border)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--cw-border)' }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{
              background: profile === 'tech_elect'
                ? 'linear-gradient(135deg, #EAB308, #CA8A04)'
                : profile === 'manager'
                  ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
                  : 'linear-gradient(135deg, var(--cw-accent), #1A7FE0)',
            }}
          >
            {profile === 'tech_elect' ? <Zap size={12} /> :
              profile === 'manager' ? <Briefcase size={12} /> : 'H'}
          </div>
          <span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--cw-text-primary)' }}>
            {profile === 'tech_elect' ? 'Elétrica' :
              profile === 'manager' ? 'Gestão' : 'Helpdesk'}
          </span>
          <ChevronDown size={12} className="ml-auto shrink-0" style={{ color: 'var(--cw-text-tertiary)' }} />
        </div>

        {/* Search */}
        <div className="px-3 py-2 shrink-0">
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px]"
            style={{
              backgroundColor: 'var(--cw-bg-tertiary)',
              color: 'var(--cw-text-tertiary)',
            }}
          >
            <Search size={13} />
            <span>Buscar...</span>
          </div>
        </div>

        {/* Nav – grows to fill available space, scrolls only if really needed */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-1 space-y-0.5"
          style={{
            scrollbarWidth: 'none', // Firefox
          }}
        >
          <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
          {menuStructure.map(item => renderMenuItem(item))}
        </nav>

        {/* Bottom — compact, clean */}
        <div className="shrink-0 border-t" style={{ borderColor: 'var(--cw-border)' }}>
          {/* User row with theme toggle & logout */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
                style={{ backgroundColor: 'var(--cw-accent)' }}
              >
                {initials}
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-[1.5px]"
                style={{ backgroundColor: 'var(--cw-success)', borderColor: 'var(--cw-bg-sidebar)' }}
              />
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate" style={{ color: 'var(--cw-text-primary)' }}>
                {user?.name || 'Usuário'}
              </p>
              <p className="text-[10px] truncate" style={{ color: 'var(--cw-text-tertiary)' }}>
                {user?.email || ''}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--cw-text-tertiary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cw-text-primary)'; e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cw-text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <button
                onClick={logout}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--cw-text-tertiary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cw-danger)'; e.currentTarget.style.backgroundColor = 'var(--cw-bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--cw-text-tertiary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                title="Sair"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
