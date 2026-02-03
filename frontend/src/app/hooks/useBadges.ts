import { useState, useEffect } from 'react';
import { ticketsApi, stockApi, reservationApi } from '../services/api';

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
    chat: 0,
    tickets: 0,
    stock: 0,
    reservations: 0,
    queue: 0,
    home: 0,
  });

  const fetchBadges = async () => {
    try {
      // Execute all requests in parallel
      const [ticketsResponse, stockStats, reservationsData] = await Promise.all([
        ticketsApi.getAll({ status: 'NEW', limit: 1 }), // We only need the total count
        stockApi.getStats(),
        reservationApi.getPendingCount().catch(() => ({ count: 0 })), // Handle potential errors gracefully
      ]);

      setBadges(prev => ({
        ...prev,
        // tickets: Total of open tickets
        tickets: ticketsResponse.total || 0,

        // stock: Low stock items
        stock: stockStats.lowStock || 0,

        // reservations: Pending reservations
        reservations: reservationsData.count || 0,

        // Chat: We don't have an unread count API yet, keeping 0 or previous
        chat: 0,

        // Queue/Home: Keep 0 for now as they depend on other systems
        queue: 0,
        home: 0
      }));
    } catch (error) {
      console.error('Error fetching badges:', error);
    }
  };

  useEffect(() => {
    fetchBadges();

    // Poll every 30 seconds
    const interval = setInterval(fetchBadges, 30000);

    return () => clearInterval(interval);
  }, []);

  return badges;
}
