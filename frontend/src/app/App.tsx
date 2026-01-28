import { useState } from 'react';
import Sidebar from '@/app/components/Sidebar';
import ChatView from '@/app/components/ChatView';
import LoginView from '@/app/components/views/LoginView';
import DashboardView from '@/app/components/views/DashboardView';
import ElectricalDashboardView from '@/app/components/views/ElectricalDashboardView';
import ManagerView from '@/app/components/views/ManagerView';
import MetricsView from '@/app/components/views/MetricsView';
import PrintersView from '@/app/components/views/PrintersView';
import BotConfigView from '@/app/components/views/BotConfigView';
import ReportsView from '@/app/components/views/ReportsView';
import FAQView from '@/app/components/views/FAQView';
import StockView from '@/app/components/views/StockView';
import UsersView from '@/app/components/views/UsersView';
import TeamChatView from '@/app/components/views/TeamChatView';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut } from 'lucide-react';

function MainContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [selectedTicketData, setSelectedTicketData] = useState<any>(null);
  const { profile, isAuthenticated, logout, isLoading } = useAuth();

  const handleTicketClick = (ticket: any) => {
    setSelectedTicketData(ticket);
  };

  const renderView = () => {
    // If manager, always return ManagerView (handled in return, but safe here too)
    if (profile === 'manager') return <ManagerView />;

    switch (activeMenuItem) {
      case 'dashboard':
        if (profile === 'tech_elect') return <ElectricalDashboardView onTicketClick={handleTicketClick} />;
        return <DashboardView onTicketClick={handleTicketClick} />;
      case 'gestao':
        return <ManagerView />; // Keep for non-managers viewing manager view if allowed
      case 'metricas':
        return <MetricsView />;
      case 'impressoras':
        return <PrintersView />;
      case 'bot':
        return <BotConfigView />;
      case 'relatorios':
        return <ReportsView />;
      case 'faq':
        return <FAQView />;
      case 'estoque':
        return <StockView />;
      case 'usuarios':
        return <UsersView />;
      case 'chat':
        return <TeamChatView />;
      default:
        if (profile === 'tech_elect') return <ElectricalDashboardView onTicketClick={handleTicketClick} />;
        return <DashboardView onTicketClick={handleTicketClick} />;
    }
  };

  // If loading session, show simple spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated, show Login View
  if (!isAuthenticated) {
    return <LoginView />;
  }

  const isManagerTvMode = profile === 'manager';

  return (
    <div className="flex min-h-screen bg-slate-950">
      {!isManagerTvMode && <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />}
      
      <main className={`flex-1 overflow-auto relative ${isManagerTvMode ? 'h-screen overflow-hidden p-0' : ''}`}>
        {/* Logout Button (Floating for easy access) */}
        <div className="absolute top-4 right-4 z-50">
          <button 
            onClick={logout}
            className={`p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-full transition-all ${isManagerTvMode ? 'bg-slate-900/80 backdrop-blur-md border border-slate-700' : 'bg-slate-800/50'}`}
            title="Sair do Sistema"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className={isManagerTvMode ? 'h-full' : 'p-6 lg:p-8 pt-16 lg:pt-8'}>
          {isManagerTvMode ? <ManagerView /> : renderView()}
        </div>
      </main>

      {/* Chat View - Drawer/Modal */}
      <AnimatePresence>
        {selectedTicketData && (
          <>
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSelectedTicketData(null)}
            />
            
            {/* Drawer Container */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full lg:w-[450px] bg-slate-950 z-50 shadow-2xl border-l border-slate-800"
            >
               <ChatView 
                 ticket={selectedTicketData}
                 onClose={() => setSelectedTicketData(null)}
                 onCloseTicket={() => setSelectedTicketData(null)}
               />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainContent />
      <Toaster position="top-right" theme="dark" closeButton richColors />
    </AuthProvider>
  );
}

export default App;
