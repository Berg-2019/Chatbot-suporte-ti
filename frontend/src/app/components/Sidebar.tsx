import { 
  LayoutDashboard, 
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
  Zap,
  Briefcase
} from 'lucide-react';
import { useState } from 'react';
import { useAuth, UserProfile } from '@/app/context/AuthContext';
import { useBadges } from '@/app/hooks/useBadges';

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: UserProfile[];
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'tech_ti', 'tech_elect', 'manager'] },
  { id: 'gestao', label: 'Gestão', icon: Briefcase, roles: ['admin', 'manager'] },
  { id: 'metricas', label: 'Métricas', icon: BarChart3, roles: ['admin', 'tech_ti'] },
  { id: 'impressoras', label: 'Impressoras', icon: Printer, roles: ['admin', 'tech_ti'] },
  { id: 'bot', label: 'Configurar Bot', icon: Bot, roles: ['admin', 'tech_ti'] },
  { id: 'relatorios', label: 'Relatórios', icon: FileText, roles: ['admin', 'tech_ti', 'manager'] },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, roles: ['admin', 'tech_ti'] },
  { id: 'estoque', label: 'Estoque', icon: Package, roles: ['admin', 'tech_ti', 'tech_elect'] },
  { id: 'usuarios', label: 'Usuários', icon: Users, roles: ['admin', 'manager'] },
  { id: 'chat', label: 'Chat Equipe', icon: MessageSquare, roles: ['admin', 'tech_ti', 'tech_elect', 'manager'] },
];

export default function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, setProfile } = useAuth();
  const badges = useBadges();

  const filteredItems = menuItems.filter(item => item.roles.includes(profile));

  const getBadgeCount = (id: string) => {
    switch (id) {
      case 'chat': return badges.chat;
      case 'estoque': return badges.stock;
      case 'dashboard': return badges.tickets; // Dashboard shows new tickets count
      default: return 0;
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 
          flex flex-col transition-transform duration-300 z-50 border-r border-slate-800
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              profile === 'tech_elect' ? 'bg-yellow-500' : 
              profile === 'manager' ? 'bg-purple-600' : 'bg-blue-600'
            }`}>
              {profile === 'tech_elect' ? <Zap className="text-white" size={24} /> : 
               profile === 'manager' ? <Briefcase className="text-white" size={24} /> :
               <LayoutDashboard className="text-white" size={24} />}
            </div>
            <div>
              <h1 className="text-white font-semibold">Helpdesk</h1>
              <p className="text-slate-400 text-xs uppercase tracking-wider">
                {profile === 'admin' && 'Administrador'}
                {profile === 'tech_ti' && 'Técnico TI'}
                {profile === 'tech_elect' && 'Elétrica'}
                {profile === 'manager' && 'Gestão'}
              </p>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            const badgeCount = getBadgeCount(item.id);
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onItemClick(item.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} />
                  <span>{item.label}</span>
                </div>
                {badgeCount > 0 && (
                  <span className={`
                    flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold
                    ${isActive 
                      ? 'bg-white text-blue-600' 
                      : 'bg-red-500 text-white'
                    }
                  `}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </aside>
    </>
  );
}
