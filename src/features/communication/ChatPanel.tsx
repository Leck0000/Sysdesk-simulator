/**
 * ChatPanel — threaded chat panel per ticket
 * 
 * Consumes: ticketsSlice (selectedTicketId), authSlice (role for instructor vs technician views)
 * Produces: threaded chat UI with message input
 * 
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA
 * Responsive: >=1280px desktop-first; sidebar collapses to drawer <1024px
 */

import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectThreadMessages, selectThreadStatus, selectThreadError } from './slice';
import { selectSelectedTicket } from '../tickets/slice';
import { processRequesterMessage } from './slice';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// Message input schema for boundary validation
const MessageInputSchema = z.object({
  text: z.string().min(1).max(1000),
});


interface ChatPanelProps {
  ticketId: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ ticketId }) => {
  const selectedTicket = useSelector(selectSelectedTicket);
  const messages = useSelector(selectThreadMessages(ticketId));
  const threadStatus = useSelector(selectThreadStatus(ticketId));
  const threadError = useSelector(selectThreadError(ticketId));
  
  const [inputValue, setInputValue] = useState('');
  
  // Scroll to bottom ref
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Fetch initial messages on mount
  useEffect(() => {
    // In a full impl, this would fetch from an API
    // For now, the thread state is managed via wsMiddleware
  }, [ticketId]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);
  
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validated = MessageInputSchema.safeParse({ text: inputValue });
    if (!validated.success) {
      toast.error('Message must be between 1 and 1000 characters');
      return;
    }
    
    const message = {
      id: uuidv4(),
      ticketId,
      from: 'system', // In a real app, this would be 'requester' or 'system' based on context
      text: validated.data.text,
      timestamp: new Date().toISOString(),
    };
    
    // Add message to thread state
    processRequesterMessage(message, ticketId);
    
    // Clear input
    setInputValue('');
  };
  
  // Handle paste events to prevent default newline behavior
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };
  
  // Render error state
  if (threadError && threadStatus === 'failed') {
    return (
      <div role="alert" className="communication-error" aria-live="polite">
        Failed to load chat: {threadError}
      </div>
    );
  }
  
  // Render loading state
  if (threadStatus === 'loading') {
    return (
      <div className="communication-loading" aria-live="polite">
        Loading messages...
      </div>
    );
  }
  
  return (
    <section className="chat-panel" aria-labelledby="chat-panel-title" tabIndex={0}>
      <h2 id="chat-panel-title" className="chat-panel-title">
        Chat — {selectedTicket?.queue ?? 'Unknown'} / {selectedTicket?.id ?? ticketId}
      </h2>
      
      {/* Thread messages */}
      <div className="chat-messages" ref={bottomRef} aria-roledescription="chat" aria-label="Threaded messages for ticket {ticketId}">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="chat-message"
            aria-label={
              `${msg.from === 'requester' ? 'Requester' : 'System'} at ${new Date(msg.timestamp).toLocaleTimeString()}`
            }
          >
            <div className="message-avatar">{msg.from[0]}</div>
            <div className="message-bubble" role="treeitem" aria-expanded="true" aria-describedby="msg-{msg.id}">
              {msg.text}
            </div>
            <span className="message-timestamp" id="msg-{msg.id}">{new Date(msg.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="chat-empty" aria-live="polite">
            No messages yet. Start the conversation.
          </div>
        )}
      </div>
      
      {/* Status indicators */}
      {threadError && threadStatus === 'failed' && (
        <p className="communication-error" role="alert" aria-live="polite">
          Failed to load chat: {threadError}
        </p>
      )}
      {threadStatus === 'loading' && (
        <p className="communication-loading" role="status" aria-live="polite">
          Loading messages...
        </p>
      )}
      
      {/* Send message form */}
      <form onSubmit={handleSend} className="chat-form" aria-label="Send message to ticket {ticketId}">
        <div className="form-group">
          <textarea
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={threadStatus === 'loading' || threadStatus === 'failed'}
            rows={1}
            className="chat-input"
            aria-label="Message input"
            aria-autocomplete="inline"
            aria-controls="chat-messages"
          />
          <button
type="submit"
            disabled={threadStatus === 'loading' || threadStatus === 'failed'}
            className="chat-submit"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
};

export default ChatPanel;
