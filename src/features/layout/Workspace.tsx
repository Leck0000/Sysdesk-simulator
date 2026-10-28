/**
 * Workspace component — main layout combining Sidebar and ticket content area
 *
 * Consumes: ticketsSlice (queue state, selectedTicket), authSlice (user role),
 *            ticketsApi (RTK Query), wsMiddleware (WebSocket for real-time updates),
 *            TopBar (header component)
 * Produces: Workspace — React component with responsive sidebar/content/layout with TopBar
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA (focus-visible, aria-labels, skip-link)
 * Responsive: >=1280px desktop sidebar layout, drawer <1024px
 */
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Sidebar } from './Sidebar';
import { Toaster } from '../components/Toaster';
import { TopBar } from './TopBar';
import { TicketQueue } from '../tickets/TicketQueue';
import { TicketDetail } from '../tickets/TicketDetail';
import { selectSelectedTicket, selectFilteredQueue } from '../tickets/slice';
import { selectAuthUser } from '../../app/auth/slice';

export function Workspace() {
  const dispatch = useDispatch();
  const selectedTicket = useSelector(selectSelectedTicket);
  const filteredQueue = useSelector(selectFilteredQueue);
  const user = useSelector(selectAuthUser);

  // If no ticket is selected but we have tickets in the queue,
  // automatically select the first one
  const autoSelectFirstTicket = () => {
    if (!selectedTicket && filteredQueue.length > 0) {
      dispatch({ type: 'tickets/selectTicket', payload: filteredQueue[0].id });
    }
  };

  useEffect(() => {
    autoSelectFirstTicket();
  }, [selectedTicket, filteredQueue.length]);

  return (
    <div className="min-h-screen bg-var(--bg)">
      <TopBar />
      <div className="flex min-h-screen flex-col">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Ticket Queue view (left sidebar area on desktop, full width on mobile) */}
            <div className="w-full md:w-64 space-y-3">
              <TicketQueue />
            </div>

            {/* Ticket detail view (main area) */}
            <div className="w-full md:w-[calc(100%-64px)] space-y-6">
              <TicketDetail />
            </div>
          </div>
        </main>
        <Toaster />
      </div>
    </div>
  );
}
