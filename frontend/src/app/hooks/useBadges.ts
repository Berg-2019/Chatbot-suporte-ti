import { useState, useEffect } from 'react';

export interface Badges {
  chat: number;
  tickets: number;
  stock: number;
  reservations: number;
  queue: number;
  home: number; // Alerts/Critical
}

export function useBadges() {
  const [badges, setBadges] = useState<Badges>({
    chat: 3,
    tickets: 5,
    stock: 2,
    reservations: 4,
    queue: 1,
    home: 1,
  });

  // Simula atualização em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setBadges(prev => ({
        ...prev,
        chat: Math.floor(Math.random() * 5),
        tickets: Math.floor(Math.random() * 8),
      }));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return badges;
}
