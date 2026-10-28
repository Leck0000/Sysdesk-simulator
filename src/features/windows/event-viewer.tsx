/**
 * Event Viewer — Simulated Windows Event Viewer application.
 *
 * Consumes: None (self-contained display)
 * Produces: Event log entries with source, level, and description filtering.
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors
 * Accessibility: WCAG 2.1 AA
 */
import React, { useState } from 'react';
import { z } from 'zod';

// Level type for filtering (string literals used at runtime)
type EventLevel = 'Critical' | 'Error' | 'Warning' | 'Information' | 'Verbose';

// Zod schema for event validation (boundary parser only — not used as runtime values)
const EventLevelSchema = z.union([
  z.literal('Critical'),
  z.literal('Error'),
  z.literal('Warning'),
  z.literal('Information'),
  z.literal('Verbose'),
]);

// Event schema (boundary validation — level stored as string)
const EventSchema = z.object({
  id: z.number().int().min(1),
  timestamp: z.string().datetime(),
  source: z.string(),
  level: z.string().refine((val) => ['Critical', 'Error', 'Warning', 'Information', 'Verbose'].includes(val)),
  category: z.string().optional(),
  eventId: z.number().int().min(0),
  message: z.string(),
});
type Event = z.infer<typeof EventSchema>;

// Sample event log entries simulating Windows Event Viewer
const sampleEvents: ReadonlyArray<Event> = [
  {
    id: 1,
    timestamp: '2026-10-28T14:30:12Z',
    source: 'Power-Troubleshooter',
    level: 'Information',
    eventId: 1000,
    message: 'Power entry',
  },
  {
    id: 2,
    timestamp: '2026-10-28T14:30:11Z',
    source: '-Windows Update',
    level: 'Information',
    eventId: 4104,
    message: 'Installation success',
  },
  {
    id: 3,
    timestamp: '2026-10-28T14:30:10Z',
    source: 'Service Control Manager',
    level: 'Information',
    eventId: 7000,
    message: 'The DHCP service has started successfully.',
  },
  {
    id: 4,
    timestamp: '2026-10-28T14:30:09Z',
    source: 'User32',
    level: 'Warning',
    eventId: 1074,
    message: 'The user session was logoff.',
  },
  {
    id: 5,
    timestamp: '2026-10-28T14:30:08Z',
    source: 'Security',
    level: 'Critical',
    eventId: 4624,
    message: 'An account was successfully logged on.',
  },
  {
    id: 6,
    timestamp: '2026-10-28T14:30:07Z',
    source: 'Browser',
    level: 'Information',
    eventId: 3000,
    message: 'Google Chrome has started.',
  },
  {
    id: 7,
    timestamp: '2026-10-28T14:30:06Z',
    source: 'Power-Troubleshooter',
    level: 'Error',
    eventId: 1,
    message: 'The system resorted to the minimum power supply.',
  },
];

export const EventViewer: React.FC = () => {
  const [levelFilter, setLevelFilter] = useState<'All' | EventLevel>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');

  // Apply filters
  const filteredEvents = sampleEvents.filter(
    (event) =>
      (levelFilter === 'All' || event.level === levelFilter) &&
      (sourceFilter === 'All' || event.source === sourceFilter)
  );

  const toggleLevel = (level: 'All' | EventLevel) => {
    setLevelFilter(level);
  };

  const toggleSource = (source: string) => {
    setSourceFilter(source);
  };

  // Map level to border color
  const getLevelBorderColor = (level: string): string => {
    switch (level) {
      case 'Critical':
      case 'Error':
        return '#e53e3e';
      case 'Warning':
        return '#f6ad55';
      case 'Information':
        return '#48bb78';
      case 'Verbose':
        return '#7f8c8d';
      default:
        return 'var(--fg)';
    }
  };

  // Map level to badge style name
  const getLevelBadgeName = (level: string): string => {
    switch (level) {
      case 'Critical':
      case 'Error':
        return 'critical';
      case 'Warning':
        return 'warning';
      case 'Information':
        return 'info';
      case 'Verbose':
        return 'verbose';
      default:
        return 'unknown';
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
            Event Viewer
          </h2>
        </div>
        <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => toggleLevel('All')}
            style={{
              marginBottom: 2,
              padding: '4px 8px',
              fontSize: '11px',
              background: levelFilter === 'All' ? 'var(--accent)' : 'var(--card)',
              color: levelFilter === 'All' ? 'var(--bg)' : 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Level: All
          </button>
          <button
            onClick={() => toggleLevel('Critical')}
            style={{
              marginBottom: 2,
              padding: '4px 8px',
              fontSize: '11px',
              background: levelFilter === 'Critical' ? 'var(--accent)' : 'var(--card)',
              color: levelFilter === 'Critical' ? 'var(--bg)' : 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Critical
          </button>
          <button
            onClick={() => toggleLevel('Error')}
            style={{
              marginBottom: 2,
              padding: '4px 8px',
              fontSize: '11px',
              background: levelFilter === 'Error' ? 'var(--accent)' : 'var(--card)',
              color: levelFilter === 'Error' ? 'var(--bg)' : 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Error
          </button>
          <button
            onClick={() => toggleLevel('Warning')}
            style={{
              marginBottom: 2,
              padding: '4px 8px',
              fontSize: '11px',
              background: levelFilter === 'Warning' ? 'var(--accent)' : 'var(--card)',
              color: levelFilter === 'Warning' ? 'var(--bg)' : 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Warning
          </button>
          <button
            onClick={() => toggleLevel('Information')}
            style={{
              marginBottom: 2,
              padding: '4px 8px',
              fontSize: '11px',
              background: levelFilter === 'Information' ? 'var(--accent)' : '
