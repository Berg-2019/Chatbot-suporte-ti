import { motion, AnimatePresence } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface MenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

interface MobileFloatingMenuProps {
  items: MenuItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function MobileFloatingMenu({ items, activeId, onSelect }: MobileFloatingMenuProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md md:hidden">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl p-2 flex justify-around items-center"
      >
        {items.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`
                relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300
                ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-blue-600/20 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              <div className="relative">
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-blue-500' : 'currentColor'} />
                
                <AnimatePresence>
                  {item.badge && item.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-slate-900 shadow-sm"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
