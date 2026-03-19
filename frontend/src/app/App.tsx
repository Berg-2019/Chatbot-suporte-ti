import { useState, lazy, Suspense } from 'react';
import Sidebar from '@/app/components/Sidebar';
import ChatView from '@/app/components/ChatView';
import ConversationListPanel from '@/app/components/ConversationListPanel';
import MobileNavigation from '@/app/components/MobileNavigation';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { ThemeProvider, useTheme } from '@/app/context/ThemeContext';
import { Toaster } from 'sonner';
import { useIsMobile } from '@/app/hooks/useIsMobile';

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

// Fase 1 - New Features
const CannedResponsesView = lazy(() => import('@/app/components/views/CannedResponsesView'));
const WebhooksView = lazy(() => import('@/app/components/views/WebhooksView'));
const RolesView = lazy(() => import('@/app/components/views/RolesView'));
const ContactsView = lazy(() => import('@/app/components/views/ContactsView'));

// Fase 2 - Chatwoot-inspired Settings
const TeamsView = lazy(() => import('@/app/components/views/TeamsView'));
const LabelsView = lazy(() => import('@/app/components/views/LabelsView'));
const SLAView = lazy(() => import('@/app/components/views/SLAView'));

// Phase 4 - Channels & Knowledge
const EmailConfigView = lazy(() => import('@/app/components/views/EmailConfigView'));
const KnowledgeArticlesView = lazy(() => import('@/app/components/views/KnowledgeArticlesView'));
const LogsView = lazy(() => import('@/app/components/views/LogsView'));
const SettingsView = lazy(() => import('@/app/components/views/SettingsView'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cw-bg-primary)' }}>
    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cw-accent)', borderTopColor: 'transparent' }}></div>
  </div>
);

// Empty state when no conversation is selected
function EmptyConversationState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--cw-bg-primary)' }}>
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--cw-bg-tertiary)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--cw-text-tertiary)' }}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--cw-text-primary)' }}>
          Selecione uma conversa
        </h3>
        <p className="text-sm max-w-xs" style={{ color: 'var(--cw-text-tertiary)' }}>
          Clique em uma conversa na lista ao lado para visualizar as mensagens
        </p>
      </div>
    </div>
  );
}

function MainContent() {
  const [activeMenuItem, setActiveMenuItem] = useState('dashboard');
  const [selectedTicketData, setSelectedTicketData] = useState<Ticket | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { profile, isAuthenticated, logout, isLoading } = useAuth();
  const isMobile = useIsMobile();

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicketData(ticket);
  };

  const handleCloseTicketDrawer = () => {
    setSelectedTicketData(null);
    setRefreshTrigger(prev => prev + 1);
  };

  // Views that use the conversation layout (3-column with chat panel)
  const isConversationView = activeMenuItem === 'dashboard' || activeMenuItem === 'mentions';
  const isManagerTvMode = profile === 'manager';

  const renderView = () => {
    if (profile === 'manager') return <ManagerView />;

    switch (activeMenuItem) {
      case 'dashboard':
      case 'mentions':
        // These render inside the 3-column layout
        return null;
      case 'gestao':
        return <ManagerView />;
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
      case 'contatos':
        return <ContactsView onInitiateChat={handleTicketClick} />;
      case 'usuarios':
        return <UsersView />;
      case 'chat':
        return <TeamChatView />;
      case 'respostas-prontas':
        return <CannedResponsesView />;
      case 'webhooks':
        return <WebhooksView />;
      case 'roles':
        return <RolesView />;
      case 'teams':
        return <TeamsView />;
      case 'labels':
        return <LabelsView />;
      case 'sla':
        return <SLAView />;
      case 'email-config':
        return <EmailConfigView />;
      case 'knowledge':
        return <KnowledgeArticlesView />;
      case 'logs':
        return <LogsView />;
      case 'system-settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cw-bg-primary)' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--cw-accent)', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LoginView />
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--cw-bg-primary)' }}>
      {/* Desktop Sidebar */}
      {!isManagerTvMode && !isMobile && (
        <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      )}

      {/* Mobile Sidebar Overlay */}
      {!isManagerTvMode && isMobile && isMobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-4/5 max-w-sm">
            <Sidebar
              activeItem={activeMenuItem}
              onItemClick={(item) => {
                setActiveMenuItem(item);
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
        </>
      )}

      {/* Conversation Layout (3 columns when dashboard) */}
      {isConversationView && !isManagerTvMode ? (
        <>
          {/* Middle column: Conversation list */}
          <div className={`${selectedTicketData ? 'hidden md:block' : 'w-full md:w-auto h-full'}`}>
            <ConversationListPanel
              onTicketClick={handleTicketClick}
              selectedTicketId={selectedTicketData?.id || null}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* Right column: Chat or empty state */}
          {selectedTicketData ? (
            <div className={`flex-1 flex flex-col border-l ${selectedTicketData ? 'flex' : 'hidden md:flex'}`} style={{ borderColor: 'var(--cw-border)' }}>
              <ChatView
                ticket={selectedTicketData}
                onClose={() => setSelectedTicketData(null)}
                onCloseTicket={handleCloseTicketDrawer}
              />
            </div>
          ) : (
            <div className="hidden md:flex flex-1">
              <EmptyConversationState />
            </div>
          )}
        </>
      ) : (
        /* Standard layout for non-conversation views */
        <main className={`flex-1 overflow-auto relative ${isManagerTvMode ? 'h-screen overflow-hidden p-0' : ''} ${isMobile && !isManagerTvMode ? 'pb-16' : ''}`}>
          <div className={isManagerTvMode ? 'h-full' : isMobile ? 'p-4' : 'p-6 lg:p-8'}>
            <Suspense fallback={<LoadingFallback />}>
              {isManagerTvMode ? <ManagerView /> : renderView()}
            </Suspense>
          </div>
        </main>
      )}

      {/* Mobile Bottom Navigation */}
      {!isManagerTvMode && isMobile && (
        <MobileNavigation
          activeItem={activeMenuItem}
          onItemClick={setActiveMenuItem}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />
      )}
    </div>
  );
}

function AppInner() {
  const { theme } = useTheme();
  return (
    <>
      <MainContent />
      <Toaster position="top-right" theme={theme} closeButton richColors />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
