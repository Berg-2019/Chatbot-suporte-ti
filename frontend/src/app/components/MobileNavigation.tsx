import { Home, MessageSquare, Users, Settings, Menu as MenuIcon } from 'lucide-react';
import { useState } from 'react';
import { useBadges } from '@/app/hooks/useBadges';

interface MobileNavigationProps {
  activeItem: string;
  onItemClick: (item: string) => void;
  onMenuClick: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export default function MobileNavigation({ activeItem, onItemClick, onMenuClick }: MobileNavigationProps) {
  const badges = useBadges();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Conversas', icon: MessageSquare, badge: badges.tickets },
    { id: 'contatos', label: 'Contatos', icon: Users },
    { id: 'chat', label: 'Equipe', icon: Home, badge: badges.chat },
    { id: 'menu', label: 'Menu', icon: MenuIcon },
  ];

  const handleItemClick = (item: NavItem) => {
    if (item.id === 'menu') {
      onMenuClick();
    } else {
      onItemClick(item.id);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t safe-area-bottom"
      style={{
        backgroundColor: 'var(--cw-bg-sidebar)',
        borderColor: 'var(--cw-border)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[60px] relative transition-colors"
              style={{
                color: isActive ? 'var(--cw-accent)' : 'var(--cw-text-secondary)',
              }}
            >
              <div className="relative">
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {item.badge && item.badge > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: 'var(--cw-accent)' }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{
                  color: isActive ? 'var(--cw-accent)' : 'var(--cw-text-tertiary)',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
