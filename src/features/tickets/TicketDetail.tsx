/**
 * TicketDetail component — detailed view of a single ticket
 *
 * Consumes: ticketsApi (for ticket data), ticketsSlice (selectedTicket, queue state),
 *            authSlice (role-based permissions), wsMiddleware (for real-time updates)
 * Produces: TicketDetail — React component with ticket details, messages, and actions
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA (focus-visible, aria-labels, color contrast via theme vars)
 * Responsive: full-width on mobile,sidebar-side on desktop
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import { selectSelectedTicket, selectFilteredQueue } from './slice';
import { useParams } from 'react-router-dom';
import { addNewMessage } from './api';

export function TicketDetail() {
  const dispatch = useDispatch();
  const { ticketId } = useParams<{ ticketId: string }>();
  const selectedTicket = useSelector(selectSelectedTicket);
  const filteredQueue = useSelector(selectFilteredQueue);
  const user = useSelector((state: { auth: { user: any } }) => state.auth.user);

  // Find the selected ticket from the queue or params
  const ticket = filteredQueue.find((t) => t.id === ticketId) || selectedTicket || null;

  const [messages, setMessages] = useState<string[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Load messages when ticket changes
  useEffect(() => {
    if (ticket) {
      setMessages([]);
    }
  }, [ticket]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !ticket) return;
    dispatch(
      addNewMessage({ ticketId: ticket.id, message: newMessage })
    );
    setMessages((prev) => [...prev, newMessage]);
    setNewMessage('');
  };

  if (!ticket) {
    return (
      <div className="p-8 text-var(--muted) text-center">
        <p>Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="bg-var(--bg) min-h-screen">
      <header className="p-4 border-b border-var(--border) flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-var(--fg)">
          Ticket #{ticket.id}
        </h1>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${ticket.priority === 'critical' ? 'var(--accent)' : 'var(--muted)'} text-var(--card)`}
          >
            {ticket.priority}
          </span>
          <span className="text-var(--muted) text-sm">{ticket.state}</span>
        </div>
      </header>

      <main className="p-4 flex-1 overflow-y-auto">
        {/* Ticket info summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-var(--muted) text-sm mb-1">Queue</p>
            <p className="font-medium">{ticket.queue}</p>
          </div>
          <div>
            <p className="text-var(--muted) text-sm mb-1">Priority</p>
            <p className="font-medium text-var(--accent)">
              {ticket.priority}
            </p>
          </div>
          <div>
            <p className="text-var(--muted) text-sm mb-1">State</p>
            <p className="font-medium">{ticket.state}</p>
          </div>
          <div>
            <p className="text-var(--muted) text-sm mb-1">Assignee</p>
            <p className={ticket.assignedTechnicianId
              ? 'text-var(--fg)'
              : 'text-var(--muted) opacity-80'}>
              {ticket.assignedTechnicianId || 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Messages section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-var(--fg) mb-3">Messages</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-var(--card) border border-var(--border)"
              >
                <p className="text-var(--muted) whitespace-pre-wrap">{msg}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Add message form */}
        <div className="border-t border-var(--border) pt-4">
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={handleMessageChange}
              rows={1}
              maxRows={3}
              className="flex-1 rounded border border-var(--border) bg-var(--card) p-2 text-var(--fg) focus:outline-none focus:ring-2 focus:ring-var(--accent) focus:ring-offset-2"
              placeholder="Add a message..."
              aria-label="Add message to ticket"
            />
            <button
              onClick={handleSendMessage}
              className="py-2 px-4 rounded border border-var(--accent) bg-var(--accent) text-var(--card) font-medium hover:opacity-90 transition-opacity"
              aria-label="Send message"
            >
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}