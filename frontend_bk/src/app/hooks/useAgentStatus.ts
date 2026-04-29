import { useState, useEffect, useCallback } from 'react';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export type AgentStatus = 'ONLINE' | 'BUSY' | 'IN_SERVICE' | 'IDLE' | 'OFFLINE';

const getStatusLabel = (status: AgentStatus): string => {
  const labels = {
    ONLINE: 'Online',
    BUSY: 'Ocupado',
    IN_SERVICE: 'Em Atendimento',
    IDLE: 'Ausente',
    OFFLINE: 'Offline',
  };
  return labels[status];
};

export interface AgentStatusInfo {
  id: string;
  name: string;
  email: string;
  status: AgentStatus;
  lastStatusChange: string | null;
  lastSeenAt: string | null;
  sector: string;
  role: string;
}

export function useAgentStatus() {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<AgentStatus>('OFFLINE');
  const [agents, setAgents] = useState<AgentStatusInfo[]>([]);

  // Identificar agente ao conectar
  useEffect(() => {
    if (user?.id && socket.connected) {
      socket.emit('agent:identify', user.id);
      console.log('🆔 Agente identificado:', user.id);
    }
  }, [user?.id, socket.connected]);

  // Escutar mudanças de status de outros agentes
  useEffect(() => {
    const handleStatusChanged = (agent: AgentStatusInfo) => {
      console.log('📊 Status do agente atualizado:', agent);

      // Atualizar próprio status
      if (agent.id === user?.id) {
        setCurrentStatus(agent.status);
      }

      // Atualizar lista de agentes
      setAgents(prev => {
        const index = prev.findIndex(a => a.id === agent.id);
        if (index >= 0) {
          const newAgents = [...prev];
          newAgents[index] = agent;
          return newAgents;
        }
        return [...prev, agent];
      });
    };

    socket.on('agent:status:changed', handleStatusChanged);

    return () => {
      socket.off('agent:status:changed', handleStatusChanged);
    };
  }, [user?.id]);

  // Atualizar status do agente
  const updateStatus = useCallback(async (newStatus: AgentStatus) => {
    console.log('🔄 updateStatus chamado:', { userId: user?.id, newStatus, socketConnected: socket.connected });

    if (!user?.id) {
      console.error('❌ user.id não está definido');
      toast.error('Erro: usuário não identificado');
      return;
    }

    try {
      // Emitir via WebSocket
      console.log('📡 Emitindo via WebSocket...');
      socket.emit('agent:status:update', {
        userId: user.id,
        status: newStatus,
      });

      // Atualizar também via API REST (fallback)
      const apiUrl = import.meta.env.VITE_API_URL;
      const url = `${apiUrl}/api/users/${user.id}/status`;
      console.log('🌐 VITE_API_URL:', apiUrl);
      console.log('🌐 user.id:', user.id);
      console.log('🌐 URL completa:', url);
      console.log('🌐 Token:', localStorage.getItem('authToken') ? 'Presente' : 'Ausente');

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      console.log('📥 Resposta da API:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro da API:', errorText);
        throw new Error(`Falha ao atualizar status: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Dados retornados:', data);

      setCurrentStatus(newStatus);
      console.log('✅ Status atualizado para:', newStatus);
      toast.success(`Status alterado para: ${getStatusLabel(newStatus)}`);
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      toast.error(`Erro ao atualizar status: ${error}`);
    }
  }, [user?.id]);

  // Buscar status de todos os agentes
  const fetchAgentsStatus = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/agents/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar status dos agentes');
      }

      const data = await response.json();
      setAgents(data);

      // Encontrar próprio status
      const myStatus = data.find((a: AgentStatusInfo) => a.id === user?.id);
      if (myStatus) {
        setCurrentStatus(myStatus.status);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar status dos agentes:', error);
    }
  }, [user?.id]);

  // Carregar status inicial
  useEffect(() => {
    if (user?.id) {
      fetchAgentsStatus();
    }
  }, [user?.id, fetchAgentsStatus]);

  // Marcar como online ao conectar
  useEffect(() => {
    if (user?.id && socket.connected && currentStatus === 'OFFLINE') {
      updateStatus('ONLINE');
    }
  }, [user?.id, socket.connected, currentStatus, updateStatus]);

  // Marcar como offline ao desconectar (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user?.id) {
        updateStatus('OFFLINE');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id, updateStatus]);

  return {
    currentStatus,
    agents,
    updateStatus,
    fetchAgentsStatus,
  };
}
