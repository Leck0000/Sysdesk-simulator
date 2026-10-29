/**
 * Demo mode — seeds sample tickets so the UI can be explored without a
 * backend. Opt-in only: add `?demo=1` to the URL or build with VITE_DEMO=1.
 * Nothing here runs against a real server.
 */
import type { Ticket } from '../features/tickets/slice';

export function isDemoMode(search: string = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  return new URLSearchParams(search).get('demo') === '1' || import.meta.env.VITE_DEMO === '1';
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const ticket = (
  id: string,
  fields: Pick<Ticket, 'queue' | 'priority' | 'state' | 'category' | 'relatedMachineId'> & { age: number }
): Ticket => ({
  id,
  queue: fields.queue,
  priority: fields.priority,
  state: fields.state,
  category: fields.category,
  relatedMachineId: fields.relatedMachineId,
  evidence: [],
  scoring: { technical: 0, process: 0, communication: 0 },
  requesterId: 'demo-requester',
  createdAt: hoursAgo(fields.age),
  updatedAt: hoursAgo(fields.age / 2),
});

export const DEMO_TICKETS: Ticket[] = [
  ticket('5b0f6c1e-2d4a-4c8e-9f11-0a1b2c3d4e01', {
    queue: 'AD', priority: 'critical', state: 'open', age: 1,
    category: 'User locked out after password reset', relatedMachineId: 'ws-finance-07',
  }),
  ticket('5b0f6c1e-2d4a-4c8e-9f11-0a1b2c3d4e02', {
    queue: 'networking', priority: 'high', state: 'open', age: 3,
    category: 'No network access on 3rd floor — APIPA address', relatedMachineId: 'ws-ops-12',
  }),
  ticket('5b0f6c1e-2d4a-4c8e-9f11-0a1b2c3d4e03', {
    queue: 'helpdesk', priority: 'medium', state: 'in_progress', age: 6,
    category: 'Print spooler keeps stopping', relatedMachineId: 'ws-hr-02',
  }),
  ticket('5b0f6c1e-2d4a-4c8e-9f11-0a1b2c3d4e04', {
    queue: 'security', priority: 'high', state: 'open', age: 9,
    category: 'Suspicious scheduled task found on laptop', relatedMachineId: 'lt-sales-31',
  }),
  ticket('5b0f6c1e-2d4a-4c8e-9f11-0a1b2c3d4e05', {
    queue: 'helpdesk', priority: 'low', state: 'resolved', age: 30,
    category: 'Mapped drive missing after login', relatedMachineId: 'ws-finance-03',
  }),
];
