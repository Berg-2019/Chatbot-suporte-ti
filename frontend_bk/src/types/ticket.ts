export interface Ticket {
  id: number | string;
  title: string;
  loc: string;
  status: 'pending' | 'urgent' | 'done' | 'progress';
  time: string;
  client: string;
  description: string;
  category: string;
  ticketNumber: string;
  date?: string;
}
