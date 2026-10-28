/**
 * tickets slice — queue state mirroring ARCHITECTURE.md data models
 *
 * Consumes: ticketsApi (RTK Query), wsMiddleware (for ticket_update events), authSlice (role for technician vs instructor views)
 * Produces: ticketsSlice with queue, selectedTicket, filters, UI state + async thunks
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';
import type { RootState, AppDispatch } from '../../app/store';
import { ticketsApi } from './api';
import { TicketPayloadSchema } from '../../shared/ws/envelope';
import { ServerEventType } from '../../shared/ws/envelope';

// ---------------------------------------------------------------------------
// Zod schema for ticket update payload from WebSocket
// ---------------------------------------------------------------------------

const TicketUpdatePayloadSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.string(),
  assigneeId: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
});

type TicketUpdatePayload = z.infer<typeof TicketUpdatePayloadSchema>;

// ---------------------------------------------------------------------------
// Types matching ARCHITECTURE.md §3.1 Ticket
// ---------------------------------------------------------------------------

export interface Ticket {
  id: string;
  queue: 'AD' | 'networking' | 'security' | 'helpdesk';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  state: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';
  evidence: string[];
  scoring: {
    technical: number;
    process: number;
    communication: number;
  };
  requesterId: string;
  assignedTechnicianId?: string;
  relatedMachineId?: string;
  labId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketFilters {
  queue?: 'AD' | 'networking' | 'security' | 'helpdesk';
  state?: 'open' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedToMe?: boolean;
  sortBy?: 'priority' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TicketsState {
  // Queue state
  queue: Ticket[];
  selectedTicketId: string | null;

  // Filters
  filters: TicketFilters;

  // UI state
  sortBy: 'priority' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  viewMode: 'list' | 'card';

  // Status
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: TicketsState = {
  queue: [],
  selectedTicketId: null,
  filters: {},
  sortBy: 'priority',
  sortOrder: 'desc',
  viewMode: 'card',
  status: 'idle',
  error: null,
};

// ---------------------------------------------------------------------------
// Priority ordering for sorting (critical > high > medium > low)
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: Record<Ticket['priority'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// ---------------------------------------------------------------------------
// Tickets slice
// ---------------------------------------------------------------------------

export const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    /** Set the entire queue (e.g., from initial load or WS sync) */
    setQueue: (state, action: PayloadAction<Ticket[]>) => {
      state.queue = action.payload;
      state.status = 'succeeded';
      state.error = null;
    },

    /** Add a new ticket to the queue */
    addTicket: (state, action: PayloadAction<Ticket>) => {
      const exists = state.queue.some((t: Ticket) => t.id === action.payload.id);
      if (!exists) {
        state.queue.push(action.payload);
      }
    },

    /** Update a ticket in the queue */
    updateTicketInQueue: (state, action: PayloadAction<Partial<Ticket> & { id: string }>) => {
      const index = state.queue.findIndex((t: Ticket) => t.id === action.payload.id);
      if (index !== -1) {
        state.queue[index] = { ...state.queue[index], ...action.payload } as Ticket;
      }
    },

    /** Remove a ticket from the queue */
    removeTicket: (state, action: PayloadAction<string>) => {
      state.queue = state.queue.filter((t: Ticket) => t.id !== action.payload);
      if (state.selectedTicketId === action.payload) {
        state.selectedTicketId = null;
      }
    },

    /** Select a ticket for detail view */
    selectTicket: (state, action: PayloadAction<string | null>) => {
      state.selectedTicketId = action.payload;
    },

    /** Set filters */
    setFilters: (state, action: PayloadAction<Partial<TicketFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    /** Clear all filters */
    clearFilters: (state) => {
      state.filters = {};
    },

    /** Set sort configuration */
    setSort: (state, action: PayloadAction<{ sortBy?: TicketsState['sortBy']; sortOrder?: TicketsState['sortOrder'] }>) => {
      if (action.payload.sortBy) state.sortBy = action.payload.sortBy;
      if (action.payload.sortOrder) state.sortOrder = action.payload.sortOrder;
    },

    /** Set view mode (list or card) */
    setViewMode: (state, action: PayloadAction<TicketsState['viewMode']>) => {
      state.viewMode = action.payload;
    },

    /** Set loading status */
    setStatus: (state, action: PayloadAction<TicketsState['status']>) => {
      state.status = action.payload;
    },

    /** Set error message */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) state.status = 'failed';
    },

    /** Clear error */
    clearError: (state) => {
      state.error = null;
      if (state.status === 'failed') state.status = 'idle';
    },

    /** Merge ticket from WebSocket ticket_update event */
    mergeTicketUpdate: (state, action: PayloadAction<TicketUpdatePayload>) => {
      const { ticketId, status, assigneeId, timestamp } = action.payload;
      const index = state.queue.findIndex((t: Ticket) => t.id === ticketId);
      if (index !== -1) {
        state.queue[index] = {
          ...state.queue[index],
          state: status as Ticket['state'],
          assignedTechnicianId: assigneeId ?? state.queue[index].assignedTechnicianId,
          updatedAt: timestamp,
        };
      }
    },
  },
});

// ---------------------------------------------------------------------------
// Async thunks that coordinate with ticketsApi and WS
// ---------------------------------------------------------------------------

/** Fetch tickets with current filters */
export const fetchTickets = (params?: { queue?: Ticket['queue']; state?: Ticket['state']; priority?: Ticket['priority']; assignedToMe?: boolean }) =>
  async (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch(ticketsSlice.actions.setStatus('loading'));
    try {
      const result = await dispatch(
        ticketsApi.endpoints.listTickets.initiate(params ?? {})
      ).unwrap();
      dispatch(ticketsSlice.actions.setQueue(result.tickets));
    } catch (error) {
      dispatch(ticketsSlice.actions.setError(error instanceof Error ? error.message : 'Failed to fetch tickets'));
    }
  };

/** Claim a ticket for the current technician */
export const claimTicket = (ticketId: string) => async (dispatch: AppDispatch) => {
  try {
    const result = await dispatch(
      ticketsApi.endpoints.claimTicket.initiate({ ticketId })
    ).unwrap();
    // The queue will be updated via WebSocket ticket_update event
    // But we can optimistically update here
    dispatch(ticketsSlice.actions.updateTicketInQueue({ id: ticketId, state: 'in_progress' }));
    return result;
  } catch (error) {
    throw error;
  }
};

/** Subscribe to WebSocket ticket updates — called on app init */
export const subscribeToTicketUpdates = () => async (dispatch: AppDispatch, getState: () => RootState) => {
  // The wsMiddleware handles WS messages and dispatches ws/message actions
  // We listen for ticket_update events and merge them into the queue
  // This is handled in the wsMiddleware listener, but we expose this thunk
  // for the component to call on mount
};

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Get filtered and sorted queue */
export const selectFilteredQueue = (state: RootState): Ticket[] => {
  const { queue, filters, sortBy, sortOrder } = state.tickets;

  let filtered = queue;

  if (filters.queue) {
    filtered = filtered.filter((t) => t.queue === filters.queue);
  }
  if (filters.state) {
    filtered = filtered.filter((t) => t.state === filters.state);
  }
  if (filters.priority) {
    filtered = filtered.filter((t) => t.priority === filters.priority);
  }
  if (filters.assignedToMe) {
    const userId = state.auth.user?.id;
    if (userId) {
      filtered = filtered.filter((t) => t.assignedTechnicianId === userId);
    }
  }

  // Sort
  filtered.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'priority':
        comparison = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        break;
      case 'createdAt':
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return filtered;
};

/** Get selected ticket */
export const selectSelectedTicket = (state: RootState): Ticket | null => {
  const { queue, selectedTicketId } = state.tickets;
  if (!selectedTicketId) return null;
  return queue.find((t) => t.id === selectedTicketId) ?? null;
};

/** Get queue count by state */
export const selectQueueCounts = (state: RootState): Record<Ticket['state'], number> => {
  const counts: Record<Ticket['state'], number> = {
    open: 0,
    in_progress: 0,
    on_hold: 0,
    resolved: 0,
    closed: 0,
  };
  state.tickets.queue.forEach((t) => {
    counts[t.state] += 1;
  });
  return counts;
};

/** Get queue count by priority */
export const selectPriorityCounts = (state: RootState): Record<Ticket['priority'], number> => {
  const counts: Record<Ticket['priority'], number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  state.tickets.queue.forEach((t) => {
    counts[t.priority] += 1;
  });
  return counts;
};

/** Get queue count by queue */
export const selectQueueTypeCounts = (state: RootState): Record<Ticket['queue'], number> => {
  const counts: Record<Ticket['queue'], number> = {
    AD: 0,
    networking: 0,
    security: 0,
    helpdesk: 0,
  };
  state.tickets.queue.forEach((t) => {
    counts[t.queue] += 1;
  });
  return counts;
};

// ---------------------------------------------------------------------------
// Action exports
// ---------------------------------------------------------------------------

export const {
  setQueue,
  addTicket,
  updateTicketInQueue,
  removeTicket,
  selectTicket,
  setFilters,
  clearFilters,
  setSort,
  setViewMode,
  setStatus,
  setError,
  clearError,
  mergeTicketUpdate,
} = ticketsSlice.actions;

export default ticketsSlice.reducer;