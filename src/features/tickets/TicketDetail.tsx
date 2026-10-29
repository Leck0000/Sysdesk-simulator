/**
 * TicketDetail — the selected ticket: summary, actions and message thread.
 *
 * Consumes: ticketsSlice (selected ticket), ticketsApi (addMessage), claimTicket thunk,
 *           desktopSlice (open a terminal on the ticket's machine)
 * Strict TS: no `any`. Theming via Tailwind tokens mapped to CSS variables.
 * Accessibility: labelled form controls; status changes announced via role="status".
 */
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectSelectedTicket, claimTicket } from './slice';
import { useAddMessageMutation } from './api';
import { openAppWindow } from '../desktop/slice';
import { DEFAULT_MACHINE_ID } from '../desktop/WindowsAppsLauncher';

interface LocalMessage {
  text: string;
  status: 'sending' | 'sent' | 'failed';
}

export function TicketDetail() {
  const dispatch = useAppDispatch();
  const ticket = useAppSelector(selectSelectedTicket);
  const [addMessage] = useAddMessageMutation();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setMessages([]);
    setDraft('');
    setNotice(null);
  }, [ticket?.id]);

  if (!ticket) {
    return (
      <div data-testid="ticket-detail-empty" className="flex h-full items-center justify-center p-8 text-muted">
        Select a ticket to see its details.
      </div>
    );
  }

  const machineId = ticket.relatedMachineId ?? DEFAULT_MACHINE_ID;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const index = messages.length;
    setMessages((prev) => [...prev, { text, status: 'sending' }]);
    const result = await addMessage({ ticketId: ticket.id, message: text });
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, status: 'error' in result ? 'failed' : 'sent' } : m))
    );
  };

  const claim = async () => {
    try {
      await dispatch(claimTicket(ticket.id));
      setNotice('Ticket claimed.');
    } catch (err) {
      setNotice(`Claim failed: ${err instanceof Error ? err.message : 'server unavailable'}`);
    }
  };

  return (
    <article data-testid="ticket-detail" aria-labelledby="ticket-title" className="flex h-full flex-col">
      <header className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted">#{ticket.id.slice(0, 8)}</p>
            <h1 id="ticket-title" className="text-xl font-semibold text-fg">
              {ticket.category ?? ticket.queue}
            </h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() =>
                dispatch(openAppWindow({ app: 'Terminal', title: `Terminal — ${machineId}`, machineId }))
              }
              className="rounded border border-border px-3 py-1.5 text-sm text-fg hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Open terminal
            </button>
            <button
              type="button"
              onClick={claim}
              disabled={ticket.state !== 'open'}
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Claim
            </button>
          </div>
        </div>
        {notice && (
          <p role="status" className="mt-2 text-sm text-muted">
            {notice}
          </p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-4 border-b border-border p-4 text-sm md:grid-cols-4">
        {[
          ['Queue', ticket.queue],
          ['Priority', ticket.priority],
          ['State', ticket.state.replace('_', ' ')],
          ['Machine', machineId],
          ['Assignee', ticket.assignedTechnicianId ?? 'Unassigned'],
          ['Created', new Date(ticket.createdAt).toLocaleString()],
          ['Evidence', `${ticket.evidence.length} item(s)`],
          ['Requester', ticket.requesterId],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-medium capitalize text-fg">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="messages-heading" className="flex min-h-0 flex-1 flex-col p-4">
        <h2 id="messages-heading" className="mb-2 text-sm font-semibold text-fg">
          Messages
        </h2>
        <ol className="flex-1 space-y-2 overflow-y-auto">
          {messages.length === 0 && <li className="text-sm text-muted">No messages yet.</li>}
          {messages.map((m, i) => (
            <li key={i} className="rounded border border-border bg-card p-2 text-sm">
              <p className="whitespace-pre-wrap text-fg">{m.text}</p>
              <p className="mt-1 text-[11px] text-muted">
                {m.status === 'sending' ? 'Sending…' : m.status === 'sent' ? 'Sent' : 'Not delivered — server unavailable'}
              </p>
            </li>
          ))}
        </ol>
        <form onSubmit={send} className="mt-3 flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Reply to the requester…"
            aria-label="Message to requester"
            className="flex-1 resize-none rounded border border-border bg-card p-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <button
            type="submit"
            className="self-end rounded bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Send
          </button>
        </form>
      </section>
    </article>
  );
}
