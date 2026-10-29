/**
 * EmailThread — simulated email conversation with the requester for one ticket.
 *
 * Consumes: communication slice (thread, email channel), ws slice (connection state)
 * Produces: sendTicketMessage({ channel: 'email' }) -> ws add_ticket_message with the
 *           subject folded into the text (the protocol has no subject field)
 * Theming: Tailwind tokens mapped to CSS variables. Accessibility: labelled fields,
 * messages are articles with a heading per subject, errors are announced.
 */
import React, { useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectThread, sendTicketMessage } from './slice';
import { MessageMeta } from './MessageMeta';

export interface EmailThreadProps {
  ticketId: string;
  /** Prefills the subject of the first email. */
  defaultSubject?: string;
}

const fieldClass =
  'w-full rounded border border-border bg-card p-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export const EmailThread: React.FC<EmailThreadProps> = ({ ticketId, defaultSubject = '' }) => {
  const dispatch = useAppDispatch();
  const thread = useAppSelector((s) => selectThread(s, ticketId));
  const connected = useAppSelector((s) => s.ws.connected);
  const emails = useMemo(() => thread.messages.filter((m) => m.channel === 'email'), [thread.messages]);
  const lastSubject = emails.at(-1)?.subject;
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Replies continue the conversation: "Re: <last subject>" unless the user typed one.
  const effectiveSubject = subject || (lastSubject ? `Re: ${lastSubject.replace(/^Re: /, '')}` : '');

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const result = dispatch(sendTicketMessage({ ticketId, channel: 'email', subject: effectiveSubject, text: body }));
    if (result.ok) {
      setSubject('');
      setBody('');
      setError(null);
    } else {
      setError(result.error);
    }
  };

  return (
    <section aria-label="Email with requester" className="flex min-h-0 flex-1 flex-col">
      {!connected && (
        <p className="mb-2 rounded border border-border bg-card px-2 py-1 text-xs text-muted">
          Not connected to a lab session — emails are kept here but not delivered.
        </p>
      )}
      <div role="log" aria-live="polite" aria-label="Emails" className="flex-1 space-y-2 overflow-y-auto">
        {emails.length === 0 && <p className="text-sm text-muted">No emails yet.</p>}
        {emails.map((m) => (
          <article key={m.id} className="rounded border border-border bg-card p-3 text-sm">
            <header className="mb-1 flex items-baseline justify-between gap-2">
              <h3 className="font-semibold text-fg">{m.subject ?? '(no subject)'}</h3>
              <span className="text-xs capitalize text-muted">{m.from === 'technician' ? 'You' : m.from}</span>
            </header>
            <p className="whitespace-pre-wrap text-fg">{m.text}</p>
            <MessageMeta message={m} />
          </article>
        ))}
      </div>
      <form onSubmit={send} className="mt-3 space-y-2" aria-label="Compose email">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={effectiveSubject || 'Subject'}
          aria-label="Email subject"
          className={fieldClass}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Write to the requester…"
          aria-label="Email body"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'email-error' : undefined}
          className={`${fieldClass} resize-none`}
        />
        <div className="flex items-center justify-between gap-2">
          {error ? (
            <p id="email-error" role="alert" className="text-xs text-fg">
              {error}
            </p>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Send email
          </button>
        </div>
      </form>
    </section>
  );
};

export default EmailThread;
