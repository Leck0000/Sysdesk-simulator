/**
 * communication slice — per-ticket conversation with the requester.
 *
 * Protocol (API_CONTRACTS.md): the client sends `add_ticket_message { ticketId, message }`
 * over the WebSocket; the server answers with `requester_message`. There is one
 * server-side thread per ticket and no email concept, so each local message is tagged
 * with the channel it was written in (chat or email). Email subjects travel inside the
 * message text ("Subject: …"), and a requester reply lands on the channel the
 * technician last used.
 *
 * Strict TS: no `any`; Zod at the boundaries.
 */

import { createSlice, nanoid, type Dispatch, type PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';
import type { RequesterMessagePayload } from '../../shared/ws/envelope';
import { AddTicketMessagePayloadSchema } from '../../shared/ws/envelope';
import { wsSend, ClientEventType } from '../../shared/ws/events';

export type MessageChannel = 'chat' | 'email';
export type MessageSender = 'requester' | 'system' | 'technician';

export interface Message {
  id: string;
  ticketId: string;
  from: MessageSender;
  channel: MessageChannel;
  text: string;
  /** Email only. */
  subject?: string;
  timestamp: string;
  /** Technician messages only: whether the frame was written to the socket. */
  delivery?: 'sent' | 'failed';
}

export interface ThreadState {
  messages: Message[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

export interface CommunicationState {
  /** ticketId -> thread */
  threads: Record<string, ThreadState>;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: CommunicationState = {
  threads: {},
  status: 'idle',
  error: null,
};

const EMPTY_THREAD: ThreadState = { messages: [], status: 'idle', error: null };

const ensureThread = (state: CommunicationState, ticketId: string): ThreadState =>
  (state.threads[ticketId] ??= { messages: [], status: 'succeeded', error: null });

export const communicationSlice = createSlice({
  name: 'communication',
  initialState,
  reducers: {
    /** Replace the whole thread for a ticket. */
    setThread: (state, action: PayloadAction<{ ticketId: string; thread: ThreadState }>) => {
      state.threads[action.payload.ticketId] = action.payload.thread;
    },
    /** Append a message (creates the thread if needed). */
    addMessage: (state, action: PayloadAction<{ ticketId: string; message: Message }>) => {
      ensureThread(state, action.payload.ticketId).messages.push(action.payload.message);
    },
    setThreadStatus: (state, action: PayloadAction<{ ticketId: string; status: ThreadState['status'] }>) => {
      const thread = state.threads[action.payload.ticketId];
      if (thread) thread.status = action.payload.status;
    },
    /** Set or clear a thread error (creates the thread if needed). */
    setThreadError: (state, action: PayloadAction<{ ticketId: string; error: string | null }>) => {
      const { ticketId, error } = action.payload;
      const thread = (state.threads[ticketId] ??= { messages: [], status: 'idle', error: null });
      thread.error = error;
      thread.status = error ? 'failed' : 'idle';
    },
    clearThreads: (state) => {
      state.threads = {};
    },
    /** A `requester_message` from the server (already Zod-validated by wsMiddleware). */
    receiveRequesterMessage: {
      reducer: (state, action: PayloadAction<RequesterMessagePayload & { id: string }>) => {
        const { id, ticketId, from, message, timestamp } = action.payload;
        const thread = ensureThread(state, ticketId);
        const lastOwn = [...thread.messages].reverse().find((m) => m.from === 'technician');
        const channel: MessageChannel = lastOwn?.channel ?? 'chat';
        thread.messages.push({
          id,
          ticketId,
          from,
          channel,
          text: message,
          timestamp,
          ...(channel === 'email' ? { subject: `Re: ${lastOwn?.subject ?? 'your ticket'}` } : {}),
        });
      },
      prepare: (payload: RequesterMessagePayload) => ({ payload: { ...payload, id: nanoid() } }),
    },
  },
});

export const { setThread, addMessage, setThreadStatus, setThreadError, clearThreads, receiveRequesterMessage } =
  communicationSlice.actions;

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

const ChatInputSchema = z.object({ text: z.string().trim().min(1, 'Message is empty').max(1000, 'Message is over 1000 characters') });
const EmailInputSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is empty').max(200, 'Subject is over 200 characters'),
  text: z.string().trim().min(1, 'Body is empty').max(2000, 'Body is over 2000 characters'),
});

export type SendTicketMessageInput =
  | { ticketId: string; channel: 'chat'; text: string }
  | { ticketId: string; channel: 'email'; subject: string; text: string };

export type SendResult = { ok: true; delivered: boolean } | { ok: false; error: string };

/**
 * Validate and send a technician message as `add_ticket_message`. While the socket
 * is down nothing is sent; the message is kept locally and marked as failed.
 */
export const sendTicketMessage =
  (input: SendTicketMessageInput) =>
  (dispatch: Dispatch, getState: () => { ws: { connected: boolean } }): SendResult => {
    let text: string;
    let subject: string | undefined;
    if (input.channel === 'email') {
      const parsed = EmailInputSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid email' };
      ({ text, subject } = parsed.data);
    } else {
      const parsed = ChatInputSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid message' };
      ({ text } = parsed.data);
    }

    const wire = AddTicketMessagePayloadSchema.safeParse({
      ticketId: input.ticketId,
      message: subject === undefined ? text : `Subject: ${subject}\n\n${text}`,
    });
    if (!wire.success) return { ok: false, error: 'Invalid ticket id' };

    const delivered = getState().ws.connected;
    if (delivered) {
      dispatch(wsSend({ type: ClientEventType.ADD_TICKET_MESSAGE, payload: wire.data }));
    }
    dispatch(
      addMessage({
        ticketId: input.ticketId,
        message: {
          id: nanoid(),
          ticketId: input.ticketId,
          from: 'technician',
          channel: input.channel,
          text,
          ...(subject === undefined ? {} : { subject }),
          timestamp: new Date().toISOString(),
          delivery: delivered ? 'sent' : 'failed',
        },
      })
    );
    return { ok: true, delivered };
  };

// ---------------------------------------------------------------------------
// Selectors (state shape kept minimal so they work with any store containing the slice)
// ---------------------------------------------------------------------------

type WithCommunication = { communication: CommunicationState };

/** Thread for a ticket; a shared empty thread when there is none (stable reference). */
export const selectThread = (state: WithCommunication, ticketId: string): ThreadState =>
  state.communication.threads[ticketId] ?? EMPTY_THREAD;

export default communicationSlice.reducer;
