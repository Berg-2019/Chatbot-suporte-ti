/**
 * Socket.IO Hook
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Get the WebSocket URL - connects directly to backend
// WebSocket cannot be proxied through Next.js rewrites
function getSocketUrl(): string {
  if (typeof window === 'undefined') return '';

  // In development, connect to backend directly on port 3000
  // In production, use the same host but port 3000 for WebSocket
  const host = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  // If running on port 3001 (frontend dev), connect to 3000 (backend)
  if (window.location.port === '3001') {
    return `${window.location.protocol}//${host}:3000`;
  }

  // Otherwise, assume backend is on the same origin or use env config
  return window.location.origin;
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const wsUrl = getSocketUrl();
    if (!wsUrl) return;

    const socket = io(wsUrl, {
      transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
      autoConnect: true,
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
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
