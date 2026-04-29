import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Cria uma instância única do socket
export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Log de eventos de conexão para debug
socket.on('connect', () => {
  console.log('🔌 Socket conectado:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket desconectado:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Erro de conexão do socket:', error);
});

export default socket;
