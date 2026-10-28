/**
 * Services — Simulated Windows Services application.
 *
 * Consumes: None (self-contained display)
 * Produces: Service list with status, description, and control actions.
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors
 * Accessibility: WCAG 2.1 AA
 */
import React, { useState } from 'react';
import { z } from 'zod';

// Service status enum (string literals for runtime)
type ServiceStatus = 'Running' | 'Stopped' | 'Paused' | 'Starting' | 'Stopping';

// Service schema (boundary validation)
const ServiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  displayName: z.string(),
  status: ServiceStatus,
  description: z.string().optional(),
  pid: z.number().int().optional(),
  runtime: z.string().optional(),
});
type Service = z.infer<typeof ServiceSchema>;

// Simulated services data
const simulatedServices: ReadonlyArray<Service> = [
  {
    id: 'svc-1',
    name: 'dhcp',
    displayName: 'DHCP Client',
    status: 'Running',
    description: 'Enables the computer to request an IP address from a DHCP server.',
    pid: 1240,
    runtime: '0:02:14',
  },
  {
    id: 'svc-2',
    name: 'spooler',
    displayName: 'Print Spooler',
    status: 'Running',
    description: 'Manages the print job queue and spooling.',
    pid: 1428,
    runtime: '0:05:32',
  },
  {
    id: 'svc-3',
    name: 'wuauserv',
    displayName: 'Windows Update',
    status: 'Stopped',
    description: 'Downloads and installs Microsoft software updates.',
    pid: null,
    runtime: null,
  },
  {
    id: 'svc-4',
    name: 'termservice',
    displayName: 'Remote Desktop Service',
    status: 'Running',
    description:
      'Supports remote desktop connections for the computer.',
    pid: 3180,
    runtime: '1:14:07',
  },
  {
    id: 'svc-5',
    name: 'crypt',
    displayName: 'Windows Crypto',
    status: 'Running',
    description:
      'Enables features that rely on cryptography, such as EFS and DLL signing.',
    pid: 840,
    runtime: '0:00:22',
  },
  {
    id: 'svc-6',
    name: 'gupdate',
    displayName: 'Google Update',
    status: 'Stopped',
    description: 'Checks for updates to Google products.',
    pid: null,
    runtime: null,
  },
  {
    id: 'svc-7',
    name: 'msiserver',
    displayName: 'Windows Installer',
    status: 'Stopped',
    description:
      'Installs, modifies, and removes software.',
    pid: null,
    runtime: null,
  },
  {
    id: 'svc-8',
    name: 'spatialservice',
    displayName: 'Windows Spatial',
    status: 'Paused',
    description:
      'Enables spatial sound and Windows Mixed Reality experiences.',
    pid: 2156,
    runtime: '0:01:45',
  },
];

export const Services: React.FC = () => {
  const [showing, setShowing] = useState<'all' | 'running' | 'stopped' | 'paused'>('all');
  const [services, setServices] = useState<Service[]>(simulatedServices);
  const [selected, setSelected] = useState<Service | null>(null);

  const filteredServices = services.filter((svc) => {
    if (showing === 'all') return true;
    if (showing === 'running') return svc.status === 'Running';
    if (showing === 'stopped') return svc.status === 'Stopped';
    if (showing === 'paused') return svc.status === 'Paused';
    return true;
  });

  const countByStatus = (target: ServiceStatus) =>
    services.filter((s) => s.status === target).length;

  const statusToColor = (status: ServiceStatus): string => {
    switch (status) {
      case 'Running':
        return '#48bb78';
      case 'Stopped':
        return '#e53e3e';
      case 'Paused':
        return '#f6ad55';
      case 'Starting':
        return '#f6ad55';
      case 'Stopping':
        return '#e53e3e';
      default:
        return 'var(--fg)';
    }
  };

  const handleStart = (id: string) => {
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setSelected({ ...svc, status: 'Starting' });
      setTimeout(() => {
        setSelected(
          services.map((s) => (s.id === id ? { ...s, status: 'Running' } : s))
        );
        setSelected(null);
      }, 800);
    }
  };

  const handleStop = (id: string) => {
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setSelected({ ...svc, status: 'Stopping' });
      setTimeout(() => {
        setSelected(
          services.map((s) => (s.id === id ? { ...s, status: 'Stopped' } : s))
        );
        setSelected(null);
      }, 800);
    }
  };

  return (
    <div
      style={{
        padding: '12px',
        overflowY: 'auto',
        height: 'calc(100vh - 200px)',
      }}
    >
      <div style={{ marginBottom: '12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
            Services
          </h2>
        </div>
        <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowing('all')}
            style={{
              marginBottom: 2,
              padding: '4px 8px',
              fontSize: '11px',
              background: showing === 'all' ? 'var(--accent)' : 'var(--card)',
              color: showing === 'all' ? 'var(--bg)' : 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            All
          </button>
          <button
            onClick={() => setShowing('running')}
            style={{
              marginBottom: 2,
              padding: '4px 8px',
              fontSize: '11px',
              background: showing === 'running' ? 'var(--accent)' : 'var(--card)',
              color: showing === 'running' ? 'var(--bg)' : 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Running {countByStatus('Running')}
          </button>
          <button
            onClick={() => setShowing('stopped')}
            style={{
              marginBottom: 2,
              padding: '4px 8px',
              fontSize: '11px',
              background: showing === 'stopped' ? 'var(--accent)' : 'var(--card)',
              color: showing === 'stopped' ? 'var(--bg)' : 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Stopped {countByStatus('Stopped')}
          </button>
          <button
            onClick={() => setShowing('paused')}
            style={{
              marginBottom: 2,
              padding: '4px 8px',
              fontSize: '11px',
              background: showing === 'paused' ? 'var(--accent)' : 'var(--card)
