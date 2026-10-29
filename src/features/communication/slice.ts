/**
 * communication slice — requester message and scoring update state
 *
 * Consumes: wsClient (requester_message, scoring_update)
 * Produces: communication state per thread (chat panel, email thread)
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';
import type { RootState, AppDispatch } from '../../app/store';

// ---------------------------------------------------------------------------
// Zod schemas for WebSocket payload boundaries
// ---------------------------------------------------------------------------

const RequesterMessageSchema = z.object({
  ticketId: z.string().uuid(),
  from: z.enum(['requester', 'system']),
  message: z.string(),
  timestamp: z.string().datetime(),
});

type RequesterMessage = z.infer<typeof RequesterMessageSchema>;

const ScoringUpdateSchema = z.object({
  ticketId: z.string().uuid(),
  score: z.number().int().min(0).max(20),
  feedback: z.string().optional(),
  timestamp: z.string().datetime(),
});

type ScoringUpdate = z.infer<typeof ScoringUpdateSchema>;

// ---------------------------------------------------------------------------
// Communication thread state — mirrors ticket message threading model
// ---------------------------------------------------------------------------

export interface Message {
  id: string;
  ticketId: string;
  from: 'requester' | 'system';
  text: string;
  timestamp: string;
}

export interface ThreadState {
  messages: Message[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ---------------------------------------------------------------------------
// Communication state — one thread per ticket
// ---------------------------------------------------------------------------

export interface CommunicationState {
  // Thread map: ticketId -> thread state
  threads: Record<string, ThreadState>;
  // Global status
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: CommunicationState = {
  threads: {},
  status: 'idle',
  error: null,
};

// ---------------------------------------------------------------------------
// Communication slice
// ---------------------------------------------------------------------------

export const communicationSlice = createSlice({
  name: 'communication',
  initialState,
  reducers: {
    /** Set the entire thread for a ticket */
    setThread: (state, action: PayloadAction<{ ticketId: string; thread: ThreadState }>) => {
      state.threads[action.payload.ticketId] = action.payload.thread;
    },
    /** Add a message to a thread */
    addMessage: (state, action: PayloadAction<{ ticketId: string; message: Message }>) => {
      const thread = state.threads[action.payload.ticketId];
      if (!thread) {
        state.threads[action.payload.ticketId] = {
          messages: [action.payload.message],
          status: 'succeeded',
          error: null,
        };
      } else {
        thread.messages.push(action.payload.message);
      }
    },
    /** Set thread status */
    setThreadStatus: (state, action: PayloadAction<{ ticketId: string; status: ThreadState['status'] }>) => {
      if (state.threads[action.payload.ticketId]) {
        state.threads[action.payload.ticketId].status = action.payload.status;
      }
    },
    /** Set thread error — also creates thread entry if missing */
    setThreadError: (state, action: PayloadAction<{ ticketId: string; error: string | null }>) => {
      const { ticketId, error } = action.payload;
      if (!state.threads[ticketId]) {
        state.threads[ticketId] = {
          messages: [],
          status: 'idle',
          error,
        };
      } else {
        state.threads[ticketId].error = error;
        if (error) {
          state.threads[ticketId].status = 'failed';
        } else {
          state.threads[ticketId].status = 'idle';
        }
      }
    },
    /** Clear all threads */
    clearThreads: (state) => {
      state.threads = {};
    },
  },
});

// ---------------------------------------------------------------------------
// Async thunks for WebSocket message handling
// ---------------------------------------------------------------------------

/** Process incoming requester_message from wsMiddleware */
export const processRequesterMessage = (
  message: RequesterMessage,
  ticketId?: string,
) => async (dispatch: AppDispatch) => {
  const validated = RequesterMessageSchema.parse(message);

  if (ticketId && validated.ticketId !== ticketId) {
    // Message is for a different ticket than specified
    return;
  }

  dispatch(
    communicationSlice.actions.addMessage({
      ticketId: validated.ticketId,
      message: {
        id: crypto.randomUUID(),
        ticketId: validated.ticketId,
        from: validated.from,
        text: validated.message,
        timestamp: validated.timestamp,
      },
    }),
  );
};

/** Process incoming scoring_update from wsMiddleware */
export const processScoringUpdate = (
  update: ScoringUpdate,
  ticketId?: string,
) => async (dispatch: AppDispatch) => {
  const validated = ScoringUpdateSchema.parse(update);

  if (ticketId && validated.ticketId !== ticketId) {
    return;
  }

  // Scoring updates don't add messages to the thread,
  // they update the ticket scoring visible in the UI
  dispatch(
    communicationSlice.actions.setThread({
      ticketId: validated.ticketId,
      thread: {
        messages: [],
        status: 'succeeded',
        error: null,
      },
    }),
  );
};

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Get thread state for a ticket */
export const selectThread = (state: RootState, ticketId: string) => {
  return state.communication.threads[ticketId] ?? {
    messages: [],
    status: 'idle',
    error: null,
  };
};

/** Get all thread messages for a ticket */
export const selectThreadMessages = (state: RootState, ticketId: string) => {
  const thread = selectThread(state, ticketId);
  return thread.messages;
};

/** Get thread status for a ticket */
export const selectThreadStatus = (state: RootState, ticketId: string) => {
  return selectThread(state, ticketId).status;
};

/** Get thread error for a ticket */
export const selectThreadError = (state: RootState, ticketId: string) => {
  return selectThread(state, ticketId).error;
};

// ---------------------------------------------------------------------------
// Action exports
// ---------------------------------------------------------------------------

export const {
  setThread,
  addMessage,
  setThreadStatus,
  setThreadError,
  clearThreads,
} = communicationSlice.actions;

export default communicationSlice.reducer;
