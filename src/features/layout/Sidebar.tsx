/**
 * Sidebar — ticket filters, queue summary and the Windows tools launcher.
 *
 * Consumes: ticketsSlice (filters, queue counts)
 * Produces: Sidebar — fixed column at >=1024px; off-canvas drawer below that
 *
 * Strict TS: no `any`; select values are narrowed with type guards.
 * CSS variables for theming via Tailwind tokens (bg-card, text-fg, border-border, ...).
 * Accessibility: labelled controls, focus-visible rings, Escape closes the drawer.
 */
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectQueueCounts, setFilters, clearFilters, type Ticket } from '../tickets/slice';
import { WindowsAppsLauncher } from '../desktop/WindowsAppsLauncher';

const QUEUES = ['AD', 'networking', 'security', 'helpdesk'] as const;
const STATES = ['open', 'in_progress', 'on_hold', 'resolved', 'closed'] as const;
const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

const QUEUE_LABELS: Record<Ticket['queue'], string> = {
  AD: 'Active Directory',
  networking: 'Networking',
  security: 'Security',
  helpdesk: 'Helpdesk',
};
const STATE_LABELS: Record<Ticket['state'], string> = {
  open: 'Open',
  in_progress: 'In progress',
  on_hold: 'On hold',
  resolved: 'Resolved',
  closed: 'Closed',
};

/** Narrow a <select> value to one of `options`, or undefined for "All". */
function pick<T extends string>(options: readonly T[], value: string): T | undefined {
  return options.find((o) => o === value);
}

const selectClass =
  'w-full rounded border border-border bg-card p-1.5 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export interface SidebarProps {
  /** Drawer state below 1024px; ignored on wide screens. */
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.tickets.filters);
  const queueCounts = useAppSelector(selectQueueCounts);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-bg/60 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}
      <aside
        data-testid="sidebar"
        aria-label="Sidebar"
        className={`sidebar fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto border-r border-border bg-card p-3 transition-transform lg:static lg:z-auto lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <section aria-labelledby="filters-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="filters-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
              Filters
            </h2>
            <button
              type="button"
              onClick={() => dispatch(clearFilters())}
              className="text-xs text-muted underline hover:text-accent"
            >
              Clear
            </button>
          </div>

          <label className="block text-xs text-muted">
            Queue
            <select
              className={selectClass}
              value={filters.queue ?? ''}
              onChange={(e) => dispatch(setFilters({ queue: pick(QUEUES, e.target.value) }))}
              aria-label="Filter tickets by queue"
            >
              <option value="">All queues</option>
              {QUEUES.map((q) => (
                <option key={q} value={q}>
                  {QUEUE_LABELS[q]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-muted">
            State
            <select
              className={selectClass}
              value={filters.state ?? ''}
              onChange={(e) => dispatch(setFilters({ state: pick(STATES, e.target.value) }))}
              aria-label="Filter tickets by state"
            >
              <option value="">All states</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {STATE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-muted">
            Priority
            <select
              className={selectClass}
              value={filters.priority ?? ''}
              onChange={(e) => dispatch(setFilters({ priority: pick(PRIORITIES, e.target.value) }))}
              aria-label="Filter tickets by priority"
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p[0]?.toUpperCase()}
                  {p.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={filters.assignedToMe ?? false}
              onChange={(e) => dispatch(setFilters({ assignedToMe: e.target.checked }))}
              className="accent-accent"
            />
            Assigned to me
          </label>
        </section>

        <section aria-labelledby="summary-heading" className="mt-5 border-t border-border pt-3">
          <h2 id="summary-heading" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Queue summary
          </h2>
          <dl className="grid grid-cols-2 gap-1 text-sm">
            {STATES.map((s) => (
              <React.Fragment key={s}>
                <dt className="text-muted">{STATE_LABELS[s]}</dt>
                <dd className="text-right font-medium text-fg">{queueCounts[s] ?? 0}</dd>
              </React.Fragment>
            ))}
          </dl>
        </section>

        <section aria-labelledby="tools-heading" className="mt-5 border-t border-border pt-3">
          <h2 id="tools-heading" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Tools
          </h2>
          <WindowsAppsLauncher />
        </section>
      </aside>
    </>
  );
}
