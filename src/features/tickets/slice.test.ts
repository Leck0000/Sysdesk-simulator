/**
 * Slice tests for tickets feature
 */

import { describe, it, expect } from 'vitest';
import ticketsReducer from './slice';

describe('ticketsSlice', () => {
  let initialState: ReturnType<typeof ticketsReducer>;

  beforeEach(() => {
    initialState = ticketsReducer(undefined, { type: '@@INIT' });
  });

  it('has an initial state', () => {
    expect(initialState.queue).toEqual([]);
    expect(initialState.selectedTicketId).toBeNull();
    expect(initialState.filters).toEqual({});
    expect(initialState.sortBy).toBe('priority');
    expect(initialState.sortOrder).toBe('desc');
    expect(initialState.viewMode).toBe('card');
    expect(initialState.status).toBe('idle');
    expect(initialState.error).toBeNull();
  });

  describe('setQueue', () => {
    it('sets the queue and marks status as succeeded', () => {
      const queue = [
        {
          id: '1',
          queue: 'networking',
          priority: 'high',
          state: 'open',
          evidence: [],
          scoring: { technical: 0, process: 0, communication: 0 },
          requesterId: 'req-1',
        },
      ];

      const state = ticketsReducer(initialState, { type: 'tickets/setQueue', payload: queue });

      expect(state.queue.length).toBe(1);
      expect(state.queue[0].id).toBe('1');
      expect(state.status).toBe('succeeded');
    });
  });

  describe('addTicket', () => {
    it('adds a new ticket to the queue', () => {
      const ticket = {
        id: '2',
        queue: 'security',
        priority: 'medium',
        state: 'open',
        evidence: [],
        scoring: { technical: 0, process: 0, communication: 0 },
        requesterId: 'req-2',
      };

      const state = ticketsReducer(initialState, { type: 'tickets/addTicket', payload: ticket });

      expect(state.queue.length).toBe(1);
      expect(state.queue[0].id).toBe('2');
    });

    it('does not add duplicate tickets', () => {
      const ticket1 = {
        id: '3',
        queue: 'AD',
        priority: 'low',
        state: 'open',
        evidence: [],
        scoring: { technical: 0, process: 0, communication: 0 },
        requesterId: 'req-3',
      };

      const state1 = ticketsReducer(initialState, { type: 'tickets/addTicket', payload: ticket1 });
      const state2 = ticketsReducer(state1, { type: 'tickets/addTicket', payload: ticket1 });

      expect(state2.queue.length).toBe(1);
    });
  });

  describe('updateTicketInQueue', () => {
    it('updates a ticket in the queue', () => {
      const ticket1 = {
        id: '4',
        queue: 'helpdesk',
        priority: 'low',
        state: 'open',
        evidence: [],
        scoring: { technical: 0, process: 0, communication: 0 },
        requesterId: 'req-4',
      };

      const state1 = ticketsReducer(initialState, { type: 'tickets/addTicket', payload: ticket1 });
      const state2 = ticketsReducer(
        state1,
        { type: 'tickets/updateTicketInQueue', payload: { id: '4', priority: 'high' } }
      );

      expect(state2.queue[0].priority).toBe('high');
    });
  });

  describe('removeTicket', () => {
    it('removes a ticket from the queue', () => {
      const ticket1 = {
        id: '5',
        queue: 'networking',
        priority: 'medium',
        state: 'open',
        evidence: [],
        scoring: { technical: 0, process: 0, communication: 0 },
        requesterId: 'req-5',
      };

      const state1 = ticketsReducer(initialState, { type: 'tickets/addTicket', payload: ticket1 });
      const state2 = ticketsReducer(state1, { type: 'tickets/removeTicket', payload: '5' });

      expect(state2.queue.length).toBe(0);
    });

    it('clears selected ticket ID if removed', () => {
      const ticket1 = {
        id: '6',
        queue: 'security',
        priority: 'high',
        state: 'open',
        evidence: [],
        scoring: { technical: 0, process: 0, communication: 0 },
        requesterId: 'req-6',
      };

      const state1 = ticketsReducer(initialState, { type: 'tickets/addTicket', payload: ticket1 });
      const state2 = ticketsReducer(state1, { type: 'tickets/selectTicket', payload: '6' });
      const state3 = ticketsReducer(state2, { type: 'tickets/removeTicket', payload: '6' });

      expect(state3.selectedTicketId).toBeNull();
      expect(state3.queue.length).toBe(0);
    });
  });

  describe('selectTicket', () => {
    it('selects a ticket for detail view', () => {
      const state = ticketsReducer(initialState, { type: 'tickets/selectTicket', payload: '7' });

      expect(state.selectedTicketId).toBe('7');
    });

    it('clears selection when null is passed', () => {
      const state = ticketsReducer(initialState, { type: 'tickets/selectTicket', payload: null });

      expect(state.selectedTicketId).toBeNull();
    });
  });

  describe('setFilters', () => {
    it('sets filters', () => {
      const state = ticketsReducer(initialState, { type: 'tickets/setFilters', payload: { queue: 'networking' } });

      expect(state.filters.queue).toBe('networking');
    });
  });

  describe('clearFilters', () => {
    it('clears all filters', () => {
      const state1 = ticketsReducer(initialState, { type: 'tickets/setFilters', payload: { queue: 'networking' } });
      const state2 = ticketsReducer(state1, { type: 'tickets/clearFilters' });

      expect(state2.filters).toEqual({});
    });
  });

  describe('setSort', () => {
    it('sets sort by priority descending', () => {
      const state = ticketsReducer(initialState, { type: 'tickets/setSort', payload: { sortBy: 'priority', sortOrder: 'desc' } });

      expect(state.sortBy).toBe('priority');
      expect(state.sortOrder).toBe('desc');
    });

    it('sets sort by updatedAt ascending', () => {
      const state = ticketsReducer(initialState, { type: 'tickets/setSort', payload: { sortBy: 'updatedAt', sortOrder: 'asc' } });

      expect(state.sortBy).toBe('updatedAt');
      expect(state.sortOrder).toBe('asc');
    });
  });

  describe('setViewMode', () => {
    it('sets view mode to list', () => {
      const state = ticketsReducer(initialState, { type: 'tickets/setViewMode', payload: 'list' });

      expect(state.viewMode).toBe('list');
    });

    it('sets view mode to card', () => {
      const state = ticketsReducer(initialState, { type: 'tickets/setViewMode', payload: 'card' });

      expect(state.viewMode).toBe('card');
    });
  });

  describe('setStatus', () => {
    it('sets loading status', () => {
      const state = ticketsReducer(initialState, { type: 'tickets/setStatus', payload: 'loading' });

      expect(state.status).toBe('loading');
    });
  });

  describe('setError', () => {
    it('sets error and marks status as failed', () => {
      const state = ticketsReducer(initialState, { type: 'tickets/setError', payload: 'Network error' });

      expect(state.error).toBe('Network error');
      expect(state.status).toBe('failed');
    });
  });

  describe('clearError', () => {
    it('clears error and resets status', () => {
      const state1 = ticketsReducer(initialState, { type: 'tickets/setError', payload: 'Network error' });
      const state2 = ticketsReducer(state1, { type: 'tickets/clearError' });

      expect(state2.error).toBeNull();
      expect(state2.status).toBe('idle');
    });
  });

  describe('mergeTicketUpdate', () => {
    it('merges a ticket update from WebSocket into the queue', () => {
      const ticket1 = {
        id: '8',
        queue: 'networking',
        priority: 'high',
        state: 'open',
        evidence: [],
        scoring: { technical: 0, process: 0, communication: 0 },
        requesterId: 'req-8',
      };

      const state1 = ticketsReducer(initialState, { type: 'tickets/addTicket', payload: ticket1 });
      const state2 = ticketsReducer(
        state1,
        { type: 'tickets/mergeTicketUpdate', payload: { ticketId: '8', status: 'in_progress', timestamp: Date.now().toString() } }
      );

      expect(state2.queue[0].state).toBe('in_progress');
    });

    it('does nothing when ticket not in queue', () => {
      const state = ticketsReducer(initialState, {
        type: 'tickets/mergeTicketUpdate',
        payload: { ticketId: '99', status: 'in_progress' },
      });

      expect(state.queue.length).toBe(0);
    });
  });
});