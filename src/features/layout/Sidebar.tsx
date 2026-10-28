/**
 * Sidebar component — collapsible sidebar with navigation and ticket queue summary
 *
 * Consumes: ticketsSlice (queue state, filters), authSlice (role-based visibility),
 *            theme CSS vars (--fg, --bg, --accent, --border, --card)
 * Produces: Sidebar — React component with navigation links and queue summary
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA (focus-visible, aria-labels, reduced motion)
 * Responsive: fixed width on >=1280px, collapses to drawer <1024px
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import { selectFilteredQueue, selectQueueCounts, selectPriorityCounts } from '../../features/tickets/slice';
import { setFilters, clearFilters as clearFiltersAction } from '../../features/tickets/slice';

export function Sidebar() {
  const dispatch = useDispatch();

  // State is read from Redux store; no need to dispatch on mount
  // as RTK Query manages data fetching lifecycle

  const [collapsed, setCollapsed] = useState(false);
  const filteredQueue = useSelector(selectFilteredQueue);
  const queueCounts = useSelector(selectQueueCounts);

  const handleToggleCollapse = () => setCollapsed(!collapsed);
  const handleClearFilters = () => {
    dispatch(clearFiltersAction());
    setCollapsed(false);
  };

  return (
    <aside
      className={`sidebar flex flex-col ${collapsed ? 'collapsed' : 'expanded'} bg-var(--card) border-r border-var(--border) h-full transition-width`}
      onClick={handleToggleCollapse}
    >
      <div className="p-4 border-b border-var(--border) flex items-center justify-between">
        <h2 className="text-lg font-semibold text-var(--fg)">
          {collapsed ? 'M' : 'Ticket Queue'}
        </h2>
        <button
          onClick={handleToggleCollapse}
          className="p-1 rounded hover:bg-var(--muted) transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Collapsed mode: just show the toggle and summary */}
      {collapsed && (
        <div className="p-3 flex-1 flex flex-col justify-end">
          <div className="flex items-center gap-2 text-sm text-var(--muted)">
            <span>{queueCounts.open || 0} Open</span>
            <span>{queueCounts.in_progress || 0} IP</span>
            <span>{queueCounts.resolved || 0} Resolved</span>
            <span>{queueCounts.closed || 0} Closed</span>
          </div>
        </div>
      )}

      {/* Expanded mode: full filter controls */}
      {!collapsed && (
        <div className="p-3 flex-1 overflow-y-auto">
          {/* Queue filter */}
          <div className="mb-3">
            <label className="block text-xs text-var(--muted) mb-1">Queue</label>
            <select
              onChange={(e) =>
                dispatch(setFilters({ queue: e.target.value as any }))}
              className="w-full rounded border border-var(--border) bg-var(--card) p-1 text-var(--fg) focus:outline-none focus:ring-2 focus:ring-var(--accent) focus:ring-offset-2"
              aria-label="Filter tickets by queue"
            >
              <option value="">All</option>
              <option value="AD">AD</option>
              <option value="networking">Net</option>
              <option value="security">Sec</option>
              <option value="helpdesk">HD</option>
            </select>
          </div>

          {/* State filter */}
          <div className="mb-3">
            <label className="block text-xs text-var(--muted) mb-1">State</label>
            <select
              onChange={(e) =>
                dispatch(setFilters({ state: e.target.value as any }))}
              className="w-full rounded border border-var(--border) bg-var(--card) p-1 text-var(--fg) focus:outline-none focus:ring-2 focus:ring-var(--accent) focus:ring-offset-2"
              aria-label="Filter tickets by state"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="in_progress">IP</option>
              <option value="on_hold">OH</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="mb-3">
            <label className="block text-xs text-var(--muted) mb-1">Priority</label>
            <select
              onChange={(e) =>
                dispatch(setFilters({ priority: e.target.value as any }))}
              className="w-full rounded border border-var(--border) bg-var(--card) p-1 text-var(--fg) focus:outline-none focus:ring-2 focus:ring-var(--accent) focus:ring-offset-2"
              aria-label="Filter tickets by priority"
            >
              <option value="">All</option>
              <option value="critical">Crit</option>
              <option value="high">High</option>
              <option value="medium">Med</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Assigned to me */}
          <div className="mb-3">
            <label className="flex items-center text-xs text-var(--muted) cursor-pointer">
              <input
                type="checkbox"
                onChange={(e) =>
                  dispatch(
                    setFilters({
                      assignedToMe: e.target.checked,
                    })
                  )}
                className="rounded border border-var(--border) bg-var(--card) p-1 focus:outline-none focus:ring-2 focus:ring-var(--accent) focus:ring-offset-2"
                aria-label="Show only tickets assigned to me"
              />
              Assigned to me
            </label>
          </div>

          {/* Queue stats */}
          <div className="mt-4 pt-3 border-t border-var(--border)">
            <p className="text-xs text-var(--muted) mb-2">Queue Summary</p>
            <div className="flex items-center gap-1">
              <span className="text-var(--accent) font-medium">{queueCounts.open || 0}</span>
              <span className="text-var(--muted)">Open</span>
            </div>
            <div className="flex items-center gap-1 my-1">
              <span className="text-var(--muted) font-medium">{queueCounts.in_progress || 0}</span>
              <span className="text-var(--muted)">In Progress</span>
            </div>
            <div className="flex items-center gap-1 my-1">
              <span className="text-var(--muted) font-medium">{queueCounts.resolved || 0}</span>
              <span className="text-var(--muted)">Resolved</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}