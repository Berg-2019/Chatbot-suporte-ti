'use client';

import { useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

export function NotificationListener() {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleHumanRequested = (data: { phone: string; message: string }) => {
            console.log('📢 Solicitação de humano recebida:', data);

            toast((t) => (
                <div className="flex flex-col gap-2">
                    <span className="font-bold">📞 Solicitação de Atendimento</span>
                    <span>O cliente {data.phone} solicitou falar com um técnico.</span>
                    <button
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm mt-1 hover:bg-blue-700"
                        onClick={() => toast.dismiss(t.id)}
                    >
                        OK
                    </button>
                </div>
            ), {
                duration: 60000, // 1 minuto
                icon: '👋',
                position: 'top-right',
            });
        };

        socket.on('human:requested', handleHumanRequested);

        return () => {
            socket.off('human:requested', handleHumanRequested);
        };
    }, [socket]);

    return null; // Componente lógico, sem renderização
}
