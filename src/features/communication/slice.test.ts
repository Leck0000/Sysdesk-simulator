/** * Communication slice tests */
import { describe, it, expect } from 'vitest';
import communicationReducer from './slice';

describe('communicationSlice', () => {
  let initialState: ReturnType<typeof communicationReducer>;

  beforeEach(() => {
    initialState = communicationReducer(undefined, { type: '@@INIT' });
  });

  it('has an initial state', () => {
    expect(initialState.threads).toEqual({});
    expect(initialState.status).toBe('idle');
    expect(initialState.error).toBeNull();
  });

  describe('setThread', () => {
    it('sets the thread for a ticket', () => {
      const thread = {
        messages: [],
        status: 'succeeded',
        error: null,
      };
      const state = communicationReducer(
        initialState,
        { type: 'communication/setThread', payload: { ticketId: 'ticket-1', thread } }
      );

      expect(state.threads['ticket-1']).toEqual(thread);
    });
  });

  describe('addMessage', () => {
    it('adds a message to a thread', () => {
      const ticket1 = 'ticket-1';

      // First add a thread, then add a message
      const state1 = communicationReducer(
        initialState,
        { type: 'communication/setThread', payload: { ticketId: ticket1, thread: { messages: [], status: 'idle', error: null } } }
      );

      const message = {
        id: 'msg-1',
        ticketId: ticket1,
        from: 'requester',
        text: 'Hello, I have a question about the system.',
        timestamp: new Date().toISOString(),
      };

      const state = communicationReducer(
        state1,
        { type: 'communication/addMessage', payload: { ticketId: ticket1, message } }
      );

      expect(state.threads[ticket1].messages.length).toBe(1);
      expect(state.threads[ticket1].messages[0].text).toBe('Hello, I have a question about the system.');
      expect(state.threads[ticket1].messages[0].from).toBe('requester');
    });

    it('creates a new thread if one does not exist', () => {
      const ticket2 = 'ticket-2';

      const message = {
        id: 'msg-2',
        ticketId: ticket2,
        from: 'system',
        text: 'System update: maintenance scheduled.',
        timestamp: new Date().toISOString(),
      };

      const state = communicationReducer(
        initialState,
        { type: 'communication/addMessage', payload: { ticketId: ticket2, message } }
      );

      expect(state.threads[ticket2]).toBeDefined();
      expect(state.threads[ticket2].messages.length).toBe(1);
      expect(state.threads[ticket2].messages[0].text).toBe('System update: maintenance scheduled.');
      expect(state.threads[ticket2].messages[0].from).toBe('system');
    });

    it('adds multiple messages to a thread', () => {
      const ticket3 = 'ticket-3';

      const state1 = communicationReducer(
        initialState,
        { type: 'communication/setThread', payload: { ticketId: ticket3, thread: { messages: [], status: 'idle', error: null } } }
      );

      const message1 = {
        id: 'msg-3a',
        ticketId: ticket3,
        from: 'requester',
        text: 'First message',
        timestamp: new Date().toISOString(),
      };

      const message2 = {
        id: 'msg-3b',
        ticketId: ticket3,
        from: 'system',
        text: 'Second message',
        timestamp: new Date().toISOString(),
      };

      const state2 = communicationReducer(
        state1,
        { type: 'communication/addMessage', payload: { ticketId: ticket3, message: message1 } }
      );

      const state3 = communicationReducer(
        state2,
        { type: 'communication/addMessage', payload: { ticketId: ticket3, message: message2 } }
      );

      expect(state3.threads[ticket3].messages.length).toBe(2);
      expect(state3.threads[ticket3].messages[0].text).toBe('First message');
      expect(state3.threads[ticket3].messages[1].text).toBe('Second message');
    });
  });

  describe('setThreadStatus', () => {
    it('sets thread status to loading', () => {
      const state1 = communicationReducer(
        initialState,
        { type: 'communication/setThread', payload: { ticketId: 't-1', thread: { messages: [], status: 'idle', error: null } } }
      );

      const state = communicationReducer(
        state1,
        { type: 'communication/setThreadStatus', payload: { ticketId: 't-1', status: 'loading' } }
      );

      expect(state.threads['t-1'].status).toBe('loading');
    });

    it('sets thread status to failed when error is set', () => {
      const state1 = communicationReducer(
        initialState,
        { type: 'communication/setThread', payload: { ticketId: 't-2', thread: { messages: [], status: 'idle', error: null } } }
      );

      communicationReducer(
        state1,
        { type: 'communication/setThreadError', payload: { ticketId: 't-2', error: 'Network error' } }
      );

      const state = communicationReducer(
        state1,
        { type: 'communication/setThreadStatus', payload: { ticketId: 't-2', status: 'failed' } }
      );

      expect(state.threads['t-2'].status).toBe('failed');
    });
  });

  describe('setThreadError', () => {
    it('sets thread error and marks status as failed', () => {
      const state1 = communicationReducer(
        initialState,
        { type: 'communication/setThread', payload: { ticketId: 't-3', thread: { messages: [], status: 'idle', error: null } } }
      );

      const state = communicationReducer(
        state1,
        { type: 'communication/setThreadError', payload: { ticketId: 't-3', error: 'Failed to load messages' } }
      );

      expect(state.threads['t-3'].error).toBe('Failed to load messages');
      expect(state.threads['t-3'].status).toBe('failed');
    });

    it('clears error and resets status to idle', () => {
      const state1 = communicationReducer(
        initialState,
        { type: 'communication/setThreadError', payload: { ticketId: 't-4', error: 'Network error' } }
      );

      const state2 = communicationReducer(
        state1,
        { type: 'communication/setThreadError', payload: { ticketId: 't-4', error: null } }
      );

      expect(state2.threads['t-4'].error).toBeNull();
      expect(state2.threads['t-4'].status).toBe('idle');
    });
  });

  describe('clearThreads', () => {
    it('clears all threads', () => {
      const state1 = communicationReducer(
        initialState,
        { type: 'communication/setThread', payload: { ticketId: 't-5', thread: { messages: [], status: 'idle', error: null } } }
      );

      const state = communicationReducer(state1, { type: 'communication/clearThreads' });

      expect(state.threads).toEqual({});
    });
  });
});
