import type React from 'react';
import type { Message } from './slice';

/** Sender, time and (for own messages) delivery status under a message. */
export const MessageMeta: React.FC<{ message: Message }> = ({ message }) => {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const who = message.from === 'technician' ? 'You' : message.from === 'requester' ? 'Requester' : 'System';
  const delivery =
    message.delivery === 'failed' ? ' · Not delivered — not connected' : message.delivery === 'sent' ? ' · Sent' : '';
  return (
    <p className="mt-1 text-[11px] text-muted">
      {who} · {time}
      {delivery}
    </p>
  );
};
