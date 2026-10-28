/**
 * TicketCard component — individual ticket display in the queue
 *
 * Consumes: ticketsApi (for ticket data), authSlice (role-based visibility), theme CSS vars
 * Produces: TicketCard — React component rendering a single ticket card
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA (focus-visible, aria-labels, color contrast via theme vars)
 * Responsive: adapts from sidebar width at <1280px
 */

import React from 'react';
import { z } from 'zod';

// Type matching the Ticket interface from slice.ts
interface Ticket {
  id: string;
  queue: 'AD' | 'networking' | 'security' | 'helpdesk';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  state: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';
  evidence: string[];
  scoring: {
    technical: number;
    process: number;
    communication: number;
  };
  requesterId: string;
  assignedTechnicianId?: string;
  relatedMachineId?: string;
  labId?: string;
  createdAt: string;
  updatedAt: string;
}

// Priority label text
const priorityLabels: Record<Ticket['priority'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// Queue label text with tooltip
const queueLabels: Record<Ticket['queue'], { label: string; alt: string }> = {
  AD: { label: 'AD', alt: 'Active Directory queue' },
  networking: { label: 'Networking', alt: 'Network queue' },
  security: { label: 'Security', alt: 'Security queue' },
  helpdesk: { label: 'Helpdesk', alt: 'Helpdesk queue' },
};

const PriorityColorMap: Record<Ticket['priority'], string> = {
  critical: 'var(--accent)',
  high: 'var(--accent)',
  medium: 'var(--muted)',
  low: 'var(--muted)',
};

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const assignedName = ticket.assignedTechnicianId
    ? 'Assigned'
    : 'Unassigned';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ticket ${ticket.id}: ${ticket.queue} - ${ticket.state}, ${assignedName}`}
      className="group rounded-md border border-var(--border) bg-var(--card) p-4 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-var(--fg) line-clamp-2">
            {ticket.category || ticket.queue}
          </h3>
          <p className="text-var(--muted text-sm line-clamp-2 mt-1)">
            Queue: {ticket.queue}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${PriorityColorMap[ticket.priority]} text-var(--card)`}
            aria-label={priorityLabels[ticket.priority]}
          >
            {priorityLabels[ticket.priority]}
          </span>

          <span className="text-var(--muted text-xs) opacity-80">
            {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <p className="text-var(--muted text-xs mt-2) line-clamp-2">
        {ticket.evidence.length > 0 ? 'Has evidence' : 'No evidence yet'}
      </p>
    </div>
  );
}