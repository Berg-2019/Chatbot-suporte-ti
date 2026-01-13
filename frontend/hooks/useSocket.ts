/**
 * Socket.IO Client Hook
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export interface BotStatus {
  connected: boolean;
  connecting: boolean;
  qrAvailable: boolean;
  pairingCodeAvailable: boolean;
  phoneNumber: string | null;
  lastConnected: string | null;
  uptime: number;
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current.on('bot:status', (status: BotStatus) => {
      setBotStatus(status);
    });

    socketRef.current.on('bot:qr', (qr: string) => {
      setQrCode(qr);
    });

    socketRef.current.on('bot:pairing', (code: string) => {
      setPairingCode(code);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const subscribeToTicket = useCallback((ticketId: number) => {
    socketRef.current?.emit('ticket:subscribe', ticketId);
  }, []);

  const unsubscribeFromTicket = useCallback((ticketId: number) => {
    socketRef.current?.emit('ticket:unsubscribe', ticketId);
  }, []);

  const onNewTicket = useCallback((callback: (ticket: any) => void) => {
    socketRef.current?.on('ticket:new', callback);
    return () => {
      socketRef.current?.off('ticket:new', callback);
    };
  }, []);

  const onTicketMessage = useCallback((ticketId: number, callback: (message: any) => void) => {
    const event = `ticket:${ticketId}:message`;
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    botStatus,
    qrCode,
    pairingCode,
    subscribeToTicket,
    unsubscribeFromTicket,
    onNewTicket,
    onTicketMessage,
  };
}
