/**
 * TicketCard — one ticket in the queue list. Clicking or pressing Enter/Space
 * selects it.
 *
 * Strict TS: no `any`. Theming via Tailwind tokens mapped to CSS variables.
 * Accessibility: rendered as a <button> with aria-pressed for the selection.
 */
import type { Ticket } from './slice';

const PRIORITY_LABELS: Record<Ticket['priority'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const PRIORITY_CLASSES: Record<Ticket['priority'], string> = {
  critical: 'bg-accent text-bg',
  high: 'border border-accent text-accent',
  medium: 'border border-border text-fg',
  low: 'border border-border text-muted',
};

const STATE_LABELS: Record<Ticket['state'], string> = {
  open: 'Open',
  in_progress: 'In progress',
  on_hold: 'On hold',
  resolved: 'Resolved',
  closed: 'Closed',
};

export interface TicketCardProps {
  ticket: Ticket;
  selected?: boolean;
  onSelect?: (ticketId: string) => void;
}

export function TicketCard({ ticket, selected = false, onSelect }: TicketCardProps) {
  return (
    <button
      type="button"
      data-testid={`ticket-card-${ticket.id}`}
      aria-pressed={selected}
      onClick={() => onSelect?.(ticket.id)}
      className={`w-full rounded-md border bg-card p-3 text-left transition-colors hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        selected ? 'border-accent' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-medium text-fg">{ticket.category ?? ticket.queue}</h3>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_CLASSES[ticket.priority]}`}>
          {PRIORITY_LABELS[ticket.priority]}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>
          {ticket.queue} · {STATE_LABELS[ticket.state]}
        </span>
        <time dateTime={ticket.createdAt}>{new Date(ticket.createdAt).toLocaleDateString()}</time>
      </div>
    </button>
  );
}
