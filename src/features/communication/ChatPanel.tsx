/**
 * ChatPanel — live chat with the requester for one ticket.
 *
 * Consumes: communication slice (thread, chat channel), ws slice (connection state)
 * Produces: sendTicketMessage({ channel: 'chat' }) -> ws add_ticket_message
 * Theming: Tailwind tokens mapped to CSS variables. Accessibility: the message list is a
 * polite live log; the input is labelled; errors are announced.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectThread, sendTicketMessage } from './slice';
import { MessageMeta } from './MessageMeta';

export interface ChatPanelProps {
  ticketId: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ ticketId }) => {
  const dispatch = useAppDispatch();
  const thread = useAppSelector((s) => selectThread(s, ticketId));
  const connected = useAppSelector((s) => s.ws.connected);
  const messages = useMemo(() => thread.messages.filter((m) => m.channel === 'chat'), [thread.messages]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const result = dispatch(sendTicketMessage({ ticketId, channel: 'chat', text: draft }));
    if (result.ok) {
      setDraft('');
      setError(null);
    } else {
      setError(result.error);
    }
  };

  return (
    <section aria-label="Chat with requester" className="flex min-h-0 flex-1 flex-col">
      {!connected && (
        <p className="mb-2 rounded border border-border bg-card px-2 py-1 text-xs text-muted">
          Not connected to a lab session — messages are kept here but not delivered.
        </p>
      )}
      <ol role="log" aria-live="polite" aria-label="Chat messages" className="flex-1 space-y-2 overflow-y-auto">
        {messages.length === 0 && <li className="text-sm text-muted">No messages yet. Start the conversation.</li>}
        {messages.map((m) => (
          <li
            key={m.id}
            className={`max-w-[80%] rounded border border-border p-2 text-sm ${m.from === 'technician' ? 'ml-auto bg-card' : 'bg-bg'}`}
          >
            <p className="whitespace-pre-wrap text-fg">{m.text}</p>
            <MessageMeta message={m} />
          </li>
        ))}
        <li ref={endRef} aria-hidden="true" />
      </ol>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          placeholder="Message the requester…"
          aria-label="Chat message"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'chat-error' : undefined}
          className="flex-1 resize-none rounded border border-border bg-card p-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <button
          type="submit"
          className="self-end rounded bg-accent px-4 py-2 text-sm font-medium text-bg hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Send
        </button>
      </form>
      {error && (
        <p id="chat-error" role="alert" className="mt-1 text-xs text-fg">
          {error}
        </p>
      )}
    </section>
  );
};

export default ChatPanel;
