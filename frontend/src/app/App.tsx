import { useState, lazy, Suspense } from 'react';
import Sidebar from '@/app/components/Sidebar';
import ChatView from '@/app/components/ChatView';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut } from 'lucide-react';
import { Ticket } from '@/app/services/api';

// Lazy load view components for better performance
const LoginView = lazy(() => import('@/app/components/views/LoginView'));
const DashboardView = lazy(() => import('@/app/components/views/DashboardView'));
const ElectricalDashboardView = lazy(() => import('@/app/components/views/ElectricalDashboardView'));
const ManagerView = lazy(() => import('@/app/components/views/ManagerView'));
const MetricsView = lazy(() => import('@/app/components/views/MetricsView'));
const PrintersView = lazy(() => import('@/app/components/views/PrintersView'));
const BotConfigView = lazy(() => import('@/app/components/views/BotConfigView'));
const ReportsView = lazy(() => import('@/app/components/views/ReportsView'));
const FAQView = lazy(() => import('@/app/components/views/FAQView'));
const StockView = lazy(() => import('@/app/components/views/StockView'));
const UsersView = lazy(() => import('@/app/components/views/UsersView'));
const TeamChatView = lazy(() => import('@/app/components/views/TeamChatView'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function MainContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [selectedTicketData, setSelectedTicketData] = useState<Ticket | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger for dashboard refresh
  const { profile, isAuthenticated, logout, isLoading } = useAuth();

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicketData(ticket);
  };

  const handleCloseTicketDrawer = () => {
    setSelectedTicketData(null);
    setRefreshTrigger(prev => prev + 1); // Force refresh of parent view
  };

  const renderView = () => {
    // If manager, always return ManagerView (handled in return, but safe here too)
    if (profile === 'manager') return <ManagerView />;

    switch (activeMenuItem) {
      case 'dashboard':
        if (profile === 'tech_elect') return <ElectricalDashboardView onTicketClick={handleTicketClick} refreshTrigger={refreshTrigger} />;
        return <DashboardView onTicketClick={handleTicketClick} refreshTrigger={refreshTrigger} />;
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
        if (profile === 'tech_elect') return <UsersView />;
        return <UsersView />;
      case 'chat':
        return <TeamChatView />;
      default:
        if (profile === 'tech_elect') return <ElectricalDashboardView onTicketClick={handleTicketClick} refreshTrigger={refreshTrigger} />;
        return <DashboardView onTicketClick={handleTicketClick} refreshTrigger={refreshTrigger} />;
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
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginView />
      </Suspense>
    );
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
            aria-label="Sair do Sistema"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className={isManagerTvMode ? 'h-full' : 'p-6 lg:p-8 pt-16 lg:pt-8'}>
          <Suspense fallback={<LoadingFallback />}>
            {isManagerTvMode ? <ManagerView /> : renderView()}
          </Suspense>
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
                onCloseTicket={handleCloseTicketDrawer}
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
