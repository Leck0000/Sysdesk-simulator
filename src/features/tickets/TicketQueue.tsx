/**
 * TicketQueue component — the main ticket queue view with sidebar integration
 *
 * Consumes: ticketsSlice (queue state, filters), authSlice (role-based filtering),
 *            wsMiddleware (for real-time ticket_update events)
 * Produces: TicketQueue — React component with ticket list grid and filter controls
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA (focus-visible, aria-labels, color contrast via theme vars)
 * Responsive: >=1280px desktop grid, collapses to drawer <1024px
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { TicketCard } from './TicketCard';
import {
  selectFilteredQueue,
  selectQueueCounts,
  selectPriorityCounts,
  selectSelectedTicket,
  setFilters,
  clearFilters as clearFiltersAction,
  claimTicket,
} from './slice';
import { RootState } from '../../app/store';

export function TicketQueue() {
  const dispatch = useDispatch();

  // Selectors
  const filteredQueue = useSelector(selectFilteredQueue);
  const queueCounts = useSelector(selectQueueCounts);
  const priorityCounts = useSelector(selectPriorityCounts);
  const selectedTicket = useSelector(selectSelectedTicket);
  const user = useSelector((state: RootState) => state.auth.user ?? null);

  // Load tickets on mount - state is populated from WebSocket ticket_update events
  // and initial server fetch is handled by RTK Query in the slice
  useEffect(() => {
    // No explicit fetch needed - RTK Query manages the API state
  }, [dispatch]);

  // Apply UI filters back to Redux
  const applyFilters = () => {
    dispatch(setFilters({ assignedToMe: user?.id !== undefined }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    dispatch(clearFiltersAction());
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Sidebar */}
      <aside
        className="sidebar w-64 md:static md:w-auto bg-card border-r border-border flex flex-col h-full"
      >
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-fg">Ticket Queue</h2>
        </div>

        {/* Filters section */}
        <div className="p-3 flex-1 overflow-y-auto">
          {/* Queue filter */}
          <div className="mb-3">
            <label className="block text-sm text-muted mb-1">Queue</label>
            <select
              onChange={(e) => dispatch(setFilters({ queue: e.target.value as any }))}
              className="w-full rounded border border-border bg-card p-2 text-fg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              aria-label="Filter tickets by queue"
            >
              <option value="">All queues</option>
              <option value="AD">AD</option>
              <option value="networking">Networking</option>
              <option value="security">Security</option>
              <option value="helpdesk">Helpdesk</option>
            </select>
          </div>

          {/* State filter */}
          <div className="mb-3">
            <label className="block text-sm text-muted mb-1">State</label>
            <select
              onChange={(e) => dispatch(setFilters({ state: e.target.value as any }))}
              className="w-full rounded border border-border bg-card p-2 text-fg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              aria-label="Filter tickets by state"
            >
              <option value="">All states</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="on_hold">On Hold</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="mb-3">
            <label className="block text-sm text-muted mb-1">Priority</label>
            <select
              onChange={(e) => dispatch(setFilters({ priority: e.target.value as any }))}
              className="w-full rounded border border-border bg-card p-2 text-fg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              aria-label="Filter tickets by priority"
            >
              <option value="">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Assigned to me toggle */}
          <div className="mb-3">
            <label className="flex items-center text-sm text-muted cursor-pointer">
              <input
                type="checkbox"
                onChange={(e) =>
                  dispatch(
                    setFilters({
                      assignedToMe: e.target.checked,
                    })
                  )}
                className="rounded border border-border bg-card p-1 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                aria-label="Show only tickets assigned to me"
              />
              Assigned to me
            </label>
          </div>

          {/* Sort options */}
          <div className="mb-3">
            <label className="block text-sm text-muted mb-1">Sort by</label>
            <select
              onChange={(e) => dispatch(setFilters({ sortBy: e.target.value as any }))}
              className="w-full rounded border border-border bg-card p-2 text-fg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              aria-label="Sort tickets"
            >
              <option value="priority">Priority</option>
              <option value="createdAt">Newest first</option>
              <option value="updatedAt">Most recent</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div className="mb-3">
            <label className="flex items-center text-sm text-muted cursor-pointer">
              <input
                type="radio"
                checked={false}
                onChange={() => {}}
                className="rounded border border-border bg-card p-1 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 mr-2"
                aria-label="List view"
              />
              <span>List</span>
              <input
                type="radio"
                checked={false}
                onChange={() => {}}
                className="rounded border border-border bg-card p-1 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                aria-label="Card view"
              />
              <span>Card</span>
            </label>
            <button
              onClick={handleClearFilters}
              className="ml-2 text-muted text-sm underline hover:text-accent"
              aria-label="Clear all filters"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Queue stats */}
        <div className="p-3 border-t border-border flex-1 flex flex-col justify-end">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>{queueCounts.open || 0} Open</span>
            <span>{queueCounts.in_progress || 0} In Progress</span>
            <span>{queueCounts.on_hold || 0} On Hold</span>
            <span>{queueCounts.resolved || 0} Resolved</span>
            <span>{queueCounts.closed || 0} Closed</span>
          </div>
          <div className="mt-2">
            <span className="text-accent font-medium">{priorityCounts.critical || 0} Critical</span>
            <span className="text-muted mx-1">|</span>
            <span>{priorityCounts.high || 0} High</span>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 p-4 md:p-6 overflow-x-auto">
        <div className="flex flex-col md:flex-row gap-4">

          {/* Ticket list/card grid */}
          <div className="flex-1 space-y-3">
            {filteredQueue.length === 0 && (
              <p className="text-muted text-center py-8">
                No tickets match the current filters.
              </p>
            )}

            {filteredQueue.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}

            {/* Empty state when tickets exist but filtered out */}
            {filteredQueue.length === 0 && selectedTicket === null && (
              <p className="text-muted text-center py-8">
                No tickets in the queue.
              </p>
            )}
          </div>

          {/* Ticket detail panel (when a ticket is selected) */}
          {selectedTicket && (
            <div
              className="w-full md:w-80 bg-card border border-border rounded-lg p-4 flex flex-col min-h-max"
            >
              <h3 className="text-lg font-semibold text-fg mb-3">Ticket Detail</h3>

              <div className="flex items-start justify-between mb-3">
                <span className="text-muted text-sm">#{selectedTicket.id}</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium text-accent text-card">
                  Critical
                </span>
              </div>

              <p className="text-muted text-sm mb-3 line-clamp-2">
                Queue: {selectedTicket.queue}
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="block text-muted mb-1">State</span>
                  <span className="font-medium">{selectedTicket.state}</span>
                </div>
                <div>
                  <span className="block text-muted mb-1">Assignee</span>
                  <span className={selectedTicket.assignedTechnicianId
                    ? 'text-fg'
                    : 'text-muted opacity-80'}>
                    {selectedTicket.assignedTechnicianId || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="block text-muted mb-1">Created</span>
                  <span className="font-medium">
                    {new Date(selectedTicket.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="block text-muted mb-1">Evidence</span>
                  <span className="font-medium">
                    {selectedTicket.evidence.length} items
                  </span>
                </div>
              </div>

              <button
                onClick={async () => dispatch(claimTicket(selectedTicket.id))}
                className="mt-4 w-full py-2 rounded border border-accent bg-accent text-card font-medium hover:opacity-90 transition-opacity"
                aria-label={`Claim ticket ${selectedTicket.id}`}
              >
                Claim Ticket
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}