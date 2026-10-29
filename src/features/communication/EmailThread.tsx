/**
 * EmailThread — simulated email thread per ticket
 *
 * Consumes: wsClient (requester_message, scoring_update), ticketsSlice (selectedTicketId),
 *           authSlice (role for instructor vs technician views)
 * Produces: simulated email thread UI
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA
 * Responsive: >=1280px desktop-first; sidebar collapses to drawer <1024px
 */

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectThreadMessages, selectThreadStatus, selectThreadError } from './slice';
import { selectSelectedTicket } from '../tickets/slice';

// Email message schema for boundary validation
const EmailMessageSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  from: z.enum(['requester', 'system', 'technician']),
  subject: z.string().min(1).max(200),
  text: z.string().min(1).max(2000),
  timestamp: z.string().datetime(),
});


interface EmailThreadProps {
  ticketId: string;
}

const EmailThread: React.FC<EmailThreadProps> = ({ ticketId }) => {
  const messages = useSelector(selectThreadMessages(ticketId));
  const threadStatus = useSelector(selectThreadStatus(ticketId));
  const threadError = useSelector(selectThreadError(ticketId));
  const selectedTicket = useSelector(selectSelectedTicket);

  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');

  // Validate email subject/body input
  const validateInput = (): boolean => {
    const result = EmailMessageSchema.safeParse({
      id: crypto.randomUUID(),
      ticketId,
      from: 'system',
      subject: newSubject.trim(),
      text: newBody.trim(),
      timestamp: new Date().toISOString(),
    });

    if (!result.success) {
      sonner.error('Subject must be 1-200 chars, body 1-2000 chars');
      return false;
    }
    return true;
  };

  // Send simulated email
  const handleSend = () => {
    if (!validateInput()) return;

    // NOTE: sending is not implemented yet; the validated message is not dispatched.

    // Add message to thread state
    // In a real app, this would send via API and receive WS confirmation
    // For now, we add to the local thread via the communication slice
    // processRequesterMessage is adapted for email-like messages

    setNewSubject('');
    setNewBody('');
  };

  // Render error state
  if (threadError && threadStatus === 'failed') {
    return (
      <div role="alert" className="communication-error" aria-live="polite">
        Failed to load email thread: {threadError}
      </div>
    );
  }

  // Render loading state
  if (threadStatus === 'loading') {
    return (
      <div className="communication-loading" aria-live="polite">Loading email thread...</div>
    );
  }

  return (
    <section className="email-thread" aria-labelledby="email-thread-title" aria-label="Email thread for ticket {ticketId}">
      <h2 id="email-thread-title">Email Thread — {selectedTicket?.queue ?? 'Unknown'} / {selectedTicket?.id ?? ticketId}</h2>

      {/* Status indicators */}
      {threadError && threadStatus === 'failed' && (
        <p role="alert" aria-live="polite" className="communication-error">
          Failed to load email thread: {threadError}
        </p>
      )}

      {threadStatus === 'loading' && (
        <p className="communication-loading" role="status" aria-live="polite">Loading email thread...</p>
      )}

      {/* Email messages list */}
      <div className="email-messages" aria-roledescription="email" aria-label="Email messages for ticket {ticketId}">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="email-message"
            aria-label={`Email from ${msg.from} at ${new Date(msg.timestamp).toLocaleTimeString()}: ${msg.subject}`}
          >
            <div className="email-avatar">{msg.from[0]}</div>
            <div className="email-subject">{msg.subject}</div>
            <div className="email-body">{msg.text}</div>
            <span className="email-timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="email-empty" aria-live="polite">
            No emails yet. Start the conversation.
          </div>
        )}
      </div>

      {/* Send email form */}
      <form onSubmit={handleSend} className="email-form" aria-label="Send email to ticket {ticketId}">
        <div className="email-form-group">
          <textarea
            placeholder="Subject..."
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            rows={1}
            maxRows={3}
            className="email-subject-input"
            aria-label="Email subject"
            aria-autocomplete="inline"
          />
          <textarea
            placeholder="Message body..."
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            rows={3}
            maxRows={10}
            className="email-body-input"
            aria-label="Email body"
          />
          <button type="submit" className="email-submit" disabled={!newSubject.trim() || !newBody.trim()}>
            Send
          </button>
        </div>
      </form>
    </section>
  );
};

export default EmailThread;
