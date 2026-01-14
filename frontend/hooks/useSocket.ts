/**
 * Socket.IO Hook
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
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
