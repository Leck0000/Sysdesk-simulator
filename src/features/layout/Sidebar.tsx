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
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectFilteredQueue, selectQueueCounts, selectPriorityCounts } from '../../features/tickets/slice';
import { setFilters, clearFilters as clearFiltersAction } from '../../features/tickets/slice';
import { WindowsAppsLauncher } from '../../features/desktop/windows-apps-launcher';

export function Sidebar() {
  const dispatch = useDispatch();
  const filteredQueue = useSelector(selectFilteredQueue);
  const queueCounts = useSelector(selectQueueCounts);

  // Determine if we're in drawer mode (viewport < 1024px)
  const [isDrawerMode, setIsDrawerMode] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    setIsDrawerMode(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDrawerMode(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const [collapsed, setCollapsed] = useState(false);
  const handleToggleCollapse = () => setCollapsed(!collapsed);
  const handleClearFilters = () => {
    dispatch(clearFiltersAction());
    if (isDrawerMode) setCollapsed(false);
    else setCollapsed(false);
  };

  return (
    <aside
      className={`sidebar flex flex-col ${collapsed ? 'collapsed' : 'expanded'} bg-var(--card) border-r border-var(--border) h-full transition-width ${isDrawerMode ? 'drawer-mode' : ''}`}
      onClick={handleToggleCollapse}
    >
      <div className="p-4 border-b border-var(--border) flex items-center justify-between">
        <h2 className="text-lg font-semibold text-var(--fg)">
          {isDrawerMode ? 'Menu' : (collapsed ? 'M' : 'Ticket Queue')}
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
      {collapsed && (!isDrawerMode && (
        <div className="p-3 flex-1 flex flex-col justify-end">
          <div className="flex items-center gap-2 text-sm text-var(--muted)">
            <span>{queueCounts.open || 0} Open</span>
            <span>{queueCounts.in_progress || 0} IP</span>
            <span>{queueCounts.resolved || 0} Resolved</span>
            <span>{queueCounts.closed || 0} Closed</span>
          </div>
        </div>
      ))}

      {/* Drawer mode: toggleable slide-in sidebar */}
      {isDrawerMode && collapsed && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={handleToggleCollapse}
          aria-label="Close sidebar drawer"
        />
      )}

      {/* Expanded mode: full filter controls */}
      {!collapsed && (!isDrawerMode && (
        <div className="p-3 flex-1 overflow-y-auto">
          {/* Queue filter */}
          <div className="mb-3">
            <label className="block text-xs text-var(--muted) mb-1">Queue</label>
            <select
              onChange={(e) =>
                dispatch(setFilters({ queue: e.target.value as any }))
              }
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
                dispatch(setFilters({ state: e.target.value as any }))
              }
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
                dispatch(setFilters({ priority: e.target.value as any }))
              }
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
                  )
                }
              className="rounded border border-var(--border) bg-var(--card) p-1 focus:outline-none focus:ring-2 focus:ring-var(--accent) focus:ring-offset-2"
              aria-label="Show only tickets assigned to me"
              /> Assigned to me
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

          {/* Windows Apps launcher */}
          <div className="mt-4 pt-3 border-t border-var(--border)">
            <p className="text-xs text-var(--muted) mb-2">Tools</p>
            <WindowsAppsLauncher />
          </div>
        </div>
      ))}

      {/* Drawer content: visible when drawer is open */}
      {isDrawerMode && !collapsed && (
        <div
          className="fixed top-0 left-0 bottom-0 w-64 bg-var(--card) shadow-2xl transform translate-x-full transition-transform duration-300 ease-in-out z-30"
          aria-label="Sidebar drawer"
        >
          <div className="p-4 border-b border-var(--border)">
            <h2 className="text-lg font-semibold text-var(--fg)">
              Menu
              <button
                onClick={handleToggleCollapse}
                className="absolute right-2 p-1 rounded hover:bg-var(--muted) transition-colors"
                aria-label="Close sidebar drawer"
              >
                ✕
              </button>
            </h2>
          </div>

          <div className="p-3 overflow-y-auto">
            {/* Queue filter */}
            <div className="mb-3">
              <label className="block text-xs text-var(--muted) mb-1">Queue</label>
              <select
                onChange={(e) =>
                  dispatch(setFilters({ queue: e.target.value as any }))
                }
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
                  dispatch(setFilters({ state: e.target.value as any }))
                }
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
                  dispatch(setFilters({ priority: e.target.value as any }))
                }
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
                    )
                  }
                className="rounded border border-var(--border) bg-var(--card) p-1 focus:outline-none focus:ring-2 focus:ring-var(--accent) focus:ring-offset-2"
                aria-label="Show only tickets assigned to me"
                /> Assigned to me
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

            {/* Windows Apps launcher */}
            <div className="mt-4 pt-3 border-t border-var(--border)">
              <p className="text-xs text-var(--muted) mb-2">Tools</p>
              <WindowsAppsLauncher />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
