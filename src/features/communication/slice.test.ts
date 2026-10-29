/** Communication slice tests: thread reducers, requester replies, and sending. */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import communicationReducer, {
  setThread,
  addMessage,
  setThreadStatus,
  setThreadError,
  clearThreads,
  receiveRequesterMessage,
  sendTicketMessage,
  selectThread,
  type Message,
  type ThreadState,
} from './slice';
import wsReducer, { initialWSState } from '../../shared/ws/slice';
import { WSActionType } from '../../shared/ws/events';

const TICKET = '7c1e2d3f-4a5b-4c6d-8e7f-0011223344aa';

const msg = (over: Partial<Message> & Pick<Message, 'id' | 'text'>): Message => ({
  ticketId: 'ticket-1',
  from: 'requester',
  channel: 'chat',
  timestamp: new Date().toISOString(),
  ...over,
});

const thread = (state: ReturnType<typeof communicationReducer>, id: string): ThreadState => {
  const t = state.threads[id];
  if (!t) throw new Error(`no thread ${id}`);
  return t;
};

describe('communicationSlice reducers', () => {
  let initialState: ReturnType<typeof communicationReducer>;

  beforeEach(() => {
    initialState = communicationReducer(undefined, { type: '@@INIT' });
  });

  it('has an initial state', () => {
    expect(initialState.threads).toEqual({});
    expect(initialState.status).toBe('idle');
    expect(initialState.error).toBeNull();
  });

  it('setThread sets the thread for a ticket', () => {
    const t: ThreadState = { messages: [], status: 'succeeded', error: null };
    const state = communicationReducer(initialState, setThread({ ticketId: 'ticket-1', thread: t }));
    expect(state.threads['ticket-1']).toEqual(t);
  });

  describe('addMessage', () => {
    it('adds a message to a thread', () => {
      const s1 = communicationReducer(initialState, setThread({ ticketId: 'ticket-1', thread: { messages: [], status: 'idle', error: null } }));
      const state = communicationReducer(s1, addMessage({ ticketId: 'ticket-1', message: msg({ id: 'msg-1', text: 'Hello, I have a question about the system.' }) }));
      expect(thread(state, 'ticket-1').messages).toHaveLength(1);
      expect(thread(state, 'ticket-1').messages[0]).toMatchObject({ text: 'Hello, I have a question about the system.', from: 'requester' });
    });

    it('creates a new thread if one does not exist', () => {
      const state = communicationReducer(
        initialState,
        addMessage({ ticketId: 'ticket-2', message: msg({ id: 'msg-2', ticketId: 'ticket-2', from: 'system', text: 'System update: maintenance scheduled.' }) })
      );
      expect(thread(state, 'ticket-2').messages).toHaveLength(1);
      expect(thread(state, 'ticket-2').messages[0]).toMatchObject({ text: 'System update: maintenance scheduled.', from: 'system' });
    });

    it('adds multiple messages to a thread in order', () => {
      let state = communicationReducer(initialState, addMessage({ ticketId: 't3', message: msg({ id: 'a', text: 'First message' }) }));
      state = communicationReducer(state, addMessage({ ticketId: 't3', message: msg({ id: 'b', from: 'system', text: 'Second message' }) }));
      expect(thread(state, 't3').messages.map((m) => m.text)).toEqual(['First message', 'Second message']);
    });
  });

  describe('setThreadStatus', () => {
    it('sets thread status to loading', () => {
      const s1 = communicationReducer(initialState, setThread({ ticketId: 't-1', thread: { messages: [], status: 'idle', error: null } }));
      const state = communicationReducer(s1, setThreadStatus({ ticketId: 't-1', status: 'loading' }));
      expect(thread(state, 't-1').status).toBe('loading');
    });

    it('sets thread status to failed', () => {
      const s1 = communicationReducer(initialState, setThread({ ticketId: 't-2', thread: { messages: [], status: 'idle', error: null } }));
      const state = communicationReducer(s1, setThreadStatus({ ticketId: 't-2', status: 'failed' }));
      expect(thread(state, 't-2').status).toBe('failed');
    });
  });

  describe('setThreadError', () => {
    it('sets thread error and marks status as failed', () => {
      const s1 = communicationReducer(initialState, setThread({ ticketId: 't-3', thread: { messages: [], status: 'idle', error: null } }));
      const state = communicationReducer(s1, setThreadError({ ticketId: 't-3', error: 'Failed to load messages' }));
      expect(thread(state, 't-3')).toMatchObject({ error: 'Failed to load messages', status: 'failed' });
    });

    it('clears error and resets status to idle', () => {
      const s1 = communicationReducer(initialState, setThreadError({ ticketId: 't-4', error: 'Network error' }));
      const state = communicationReducer(s1, setThreadError({ ticketId: 't-4', error: null }));
      expect(thread(state, 't-4')).toMatchObject({ error: null, status: 'idle' });
    });
  });

  it('clearThreads clears all threads', () => {
    const s1 = communicationReducer(initialState, setThread({ ticketId: 't-5', thread: { messages: [], status: 'idle', error: null } }));
    expect(communicationReducer(s1, clearThreads()).threads).toEqual({});
  });

  describe('receiveRequesterMessage', () => {
    const reply = { ticketId: TICKET, from: 'requester' as const, message: 'Still broken', timestamp: '2026-10-29T10:00:00Z' };

    it('adds the reply on the chat channel by default', () => {
      const state = communicationReducer(initialState, receiveRequesterMessage(reply));
      expect(thread(state, TICKET).messages[0]).toMatchObject({ from: 'requester', channel: 'chat', text: 'Still broken' });
      expect(thread(state, TICKET).messages[0]?.id).toEqual(expect.any(String));
    });

    it('replies on the channel the technician last used', () => {
      const s1 = communicationReducer(
        initialState,
        addMessage({ ticketId: TICKET, message: msg({ id: 'e1', ticketId: TICKET, from: 'technician', channel: 'email', subject: 'Printer', text: 'Try again?' }) })
      );
      const state = communicationReducer(s1, receiveRequesterMessage(reply));
      expect(thread(state, TICKET).messages[1]).toMatchObject({ channel: 'email', subject: 'Re: Printer' });
    });
  });

  it('selectThread returns a stable empty thread for unknown tickets', () => {
    const root = { communication: initialState };
    expect(selectThread(root, 'nope')).toBe(selectThread(root, 'other'));
  });
});

describe('sendTicketMessage', () => {
  function setup(connected: boolean) {
    const seen: UnknownAction[] = [];
    const recorder: Middleware = () => (next) => (action) => {
      seen.push(action as UnknownAction);
      return next(action);
    };
    const store = configureStore({
      reducer: { communication: communicationReducer, ws: wsReducer },
      preloadedState: { ws: { ...initialWSState, connected } },
      middleware: (gdm) => gdm().concat(recorder),
    });
    return { store, seen };
  }

  it('sends chat over ws add_ticket_message and records it as sent', () => {
    const { store, seen } = setup(true);
    store.dispatch(sendTicketMessage({ ticketId: TICKET, channel: 'chat', text: 'Can you restart?' }));
    expect(seen).toContainEqual({
      type: WSActionType.SEND,
      payload: { type: 'add_ticket_message', payload: { ticketId: TICKET, message: 'Can you restart?' } },
    });
    expect(thread(store.getState().communication, TICKET).messages[0]).toMatchObject({
      from: 'technician',
      channel: 'chat',
      text: 'Can you restart?',
      delivery: 'sent',
    });
  });

  it('sends email with its subject folded into the message text', () => {
    const { store, seen } = setup(true);
    store.dispatch(sendTicketMessage({ ticketId: TICKET, channel: 'email', subject: 'Printer', text: 'Please power-cycle it.' }));
    const send = seen.find((a) => a.type === WSActionType.SEND);
    expect(send?.payload).toEqual({
      type: 'add_ticket_message',
      payload: { ticketId: TICKET, message: 'Subject: Printer\n\nPlease power-cycle it.' },
    });
    expect(thread(store.getState().communication, TICKET).messages[0]).toMatchObject({ channel: 'email', subject: 'Printer', text: 'Please power-cycle it.' });
  });

  it('does not send while disconnected; the message is kept and marked failed', () => {
    const { store, seen } = setup(false);
    store.dispatch(sendTicketMessage({ ticketId: TICKET, channel: 'chat', text: 'hello' }));
    expect(seen.some((a) => a.type === WSActionType.SEND)).toBe(false);
    expect(thread(store.getState().communication, TICKET).messages[0]).toMatchObject({ text: 'hello', delivery: 'failed' });
  });

  it('rejects empty or oversized input without sending', () => {
    const { store, seen } = setup(true);
    expect(store.dispatch(sendTicketMessage({ ticketId: TICKET, channel: 'chat', text: '   ' }))).toEqual({ ok: false, error: expect.any(String) });
    expect(store.dispatch(sendTicketMessage({ ticketId: TICKET, channel: 'email', subject: '', text: 'body' }))).toEqual({ ok: false, error: expect.any(String) });
    expect(seen.some((a) => a.type === WSActionType.SEND)).toBe(false);
  });
});
