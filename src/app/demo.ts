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

/** Sample subsystem snapshots, applied as if the server sent ws state.delta. */
export const DEMO_SUBSYSTEMS: Record<string, unknown> = {
  services: [
    { name: 'Spooler', displayName: 'Print Spooler', status: 'stopped', startMode: 'auto' },
    { name: 'Dhcp', displayName: 'DHCP Client', status: 'running', startMode: 'auto' },
    { name: 'Dnscache', displayName: 'DNS Client', status: 'running', startMode: 'auto' },
    { name: 'LanmanWorkstation', displayName: 'Workstation', status: 'running', startMode: 'auto' },
    { name: 'wuauserv', displayName: 'Windows Update', status: 'paused', startMode: 'manual' },
    { name: 'W32Time', displayName: 'Windows Time', status: 'error', startMode: 'manual' },
  ],
  'event-log': [
    {
      id: '7c1e2d3f-4a5b-4c6d-8e7f-001122334401',
      level: 'Error',
      message: 'The Print Spooler service terminated unexpectedly.',
      timeGenerated: hoursAgo(1),
      eventId: '7034',
    },
    {
      id: '7c1e2d3f-4a5b-4c6d-8e7f-001122334402',
      level: 'Warning',
      message: 'Name resolution for the name wpad timed out.',
      timeGenerated: hoursAgo(2),
      eventId: '1014',
    },
  ],
  registry: [
    { path: String.raw`HKLM\SYSTEM\CurrentControlSet\Services\Spooler\Start`, value: '2', type: 'DWORD' },
    { path: String.raw`HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU\NoAutoUpdate`, value: '1', type: 'DWORD' },
    { path: String.raw`HKCU\Network\S\RemotePath`, value: String.raw`\\fs01\shared`, type: 'String' },
  ],
  network: [
    { name: 'Ethernet0', status: 'up', ip: '169.254.12.40', netmask: '255.255.0.0', mac: '00-15-5D-01-02-03' },
    { name: 'Wi-Fi', status: 'down', mac: '00-15-5D-01-02-04' },
  ],
  ad: [
    {
      id: '5f0b6a2e-1c3d-4e5f-8a9b-00112233aa01',
      name: 'Dana Whitfield',
      distinguishedName: 'CN=Dana Whitfield,OU=Finance,DC=corp,DC=example',
      enabled: false,
      whenCreated: '2025-03-14T09:00:00Z',
      lastLogon: hoursAgo(26),
    },
    {
      id: '5f0b6a2e-1c3d-4e5f-8a9b-00112233aa02',
      name: 'Sam Ortiz',
      distinguishedName: 'CN=Sam Ortiz,OU=IT,DC=corp,DC=example',
      enabled: true,
      whenCreated: '2024-11-02T09:00:00Z',
      lastLogon: hoursAgo(1),
    },
  ],
  filesystem: [
    { letter: 'C', fsType: 'NTFS', sizeBytes: 255_000_000_000, freeBytes: 3_100_000_000 },
    { letter: 'D', fsType: 'NTFS', sizeBytes: 1_000_000_000_000, freeBytes: 640_000_000_000 },
  ],
};
