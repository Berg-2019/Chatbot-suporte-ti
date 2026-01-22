/**
 * Socket.IO Hook
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Use relative URL - Socket.IO will connect to the same origin the page was loaded from
// For external access, this ensures it connects through the same host
function getSocketUrl(): string {
  if (typeof window === 'undefined') return '';
  // Use the current page origin for WebSocket connection
  return window.location.origin;
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const wsUrl = getSocketUrl();
    if (!wsUrl) return;

    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      path: '/socket.io',
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket conectado');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket desconectado');
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribeToTicket = useCallback((ticketId: string) => {
    socketRef.current?.emit('ticket:subscribe', ticketId);
  }, []);

  const unsubscribeFromTicket = useCallback((ticketId: string) => {
    socketRef.current?.emit('ticket:unsubscribe', ticketId);
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    subscribeToTicket,
    unsubscribeFromTicket,
    on,
  };
}
