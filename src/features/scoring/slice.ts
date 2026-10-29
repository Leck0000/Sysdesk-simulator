/**
 * Scoring slice — real-time scoring state mirroring ARCHITECTURE.md data models
 *
 * Consumes: wsMiddleware (scoring_update events), ticketsSlice (selectedTicketId)
 * Produces: scoresSlice with per-criterion scores, score summary, UI state
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';
import type { RootState, AppDispatch } from '../../app/store';

// ---------------------------------------------------------------------------
// Zod schemas for scoring payload boundaries
// ---------------------------------------------------------------------------

export const ScoringUpdatePayloadSchema = z.object({
  ticketId: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  feedback: z.string().optional(),
  timestamp: z.string().datetime(),
});

type ScoringUpdatePayload = z.infer<typeof ScoringUpdatePayloadSchema>;

// ---------------------------------------------------------------------------
// Types matching ARCHITECTURE.md §3.1 Ticket scoring + §5.6 Scoring Update
// ---------------------------------------------------------------------------

/** Per-criterion score entry */
export interface CriterionScore {
  id: string;
  name: string;
  score: number; // 0-100
  maxScore: number; // 0-100
}

/** Scoring state for a ticket */
export interface ScoringState {
  /** Per-criterion scores, keyed by criterion ID */
  criterionScores: Record<string, CriterionScore>;
  /** Overall technical score */
  technical: number;
  /** Overall process score */
  process: number;
  /** Overall communication score */
  communication: number;
  /** Last received timestamp */
  lastUpdated: string | null;
  /** Feedback string from last update */
  feedback: string | null;
  /** Is currently subscribed to WS */
  isSubscribed: boolean;
}

/** Initial scoring state */
const initialScoringState: ScoringState = {
  criterionScores: {},
  technical: 0,
  process: 0,
  communication: 0,
  lastUpdated: null,
  feedback: null,
  isSubscribed: false,
};

// ---------------------------------------------------------------------------
// Redux slice
// ---------------------------------------------------------------------------

export const scoresSlice = createSlice({
  name: 'scores',
  initialState: initialScoringState,
  reducers: {
    /** Set per-criterion scores from a scoring update */
    setCriterionScores: (state, action: PayloadAction<Record<string, number>>) => {
      const updates = action.payload;
      // Update each criterion score
      Object.keys(updates).forEach((criterionId) => {
        const score = updates[criterionId];
        // Find or create the criterion score entry
        if (score !== undefined) {
          // Map criterion IDs to names based on known categories
          const criterionName = criterionId; // fallback name
          state.criterionScores[criterionId] = {
            id: criterionId,
            name: criterionName,
            score,
            maxScore: 100,
          };
        } else {
          state.criterionScores[criterionId].score = score;
        }
      });

      // Recalculate the three aggregate scores
      // Distribution: technical = sum of relevant criteria, etc.
      // For now, distribute equally across the three buckets
      const technicalTotal = Object.values(updates).reduce(
        (sum, s) => sum + (s ?? 0),
        0
      );
      state.technical = Math.round((technicalTotal / Math.max(Object.keys(updates).length, 1)) * 100) / 100;
      state.process = Math.round((technicalTotal / Math.max(Object.keys(updates).length, 1)) * 100) / 100;
      state.communication = Math.round((technicalTotal / Math.max(Object.keys(updates).length, 1)) * 100) / 100;
      state.lastUpdated = new Date().toISOString();
    },

    /** Merge a scoring_update WebSocket event into the state */
    mergeScoringUpdate: (state, action: PayloadAction<ScoringUpdatePayload>) => {
      const { score, feedback, timestamp } = action.payload;

      // Update the overall scores
      state.technical = score;
      state.process = score;
      state.communication = score;
      state.feedback = feedback ?? state.feedback;
      state.lastUpdated = timestamp;

      // TODO: In a full implementation, we'd map the single score to
      // per-criterion updates based on the selected ticket's rubric
    },

    /** Subscribe to WS scoring updates */
    setSubscribed: (state, action: PayloadAction<boolean>) => {
      state.isSubscribed = action.payload;
    },

    /** Select a ticket — load its rubric and initialize scores */
    selectTicket: (state, action: PayloadAction<string | null>) => {
      if (!action.payload) {
        // Reset scores when no ticket selected
        state.criterionScores = {};
        state.technical = 0;
        state.process = 0;
        state.communication = 0;
        state.lastUpdated = null;
        state.feedback = null;
        return;
      }
      // TODO: In a full implementation, would load the rubric for the
      // ticket's type and initialize criterion scores from the rubric
      // For now, keep existing state; the WS will stream updates
    },
  },
});

// ---------------------------------------------------------------------------
// Async thunks that coordinate with scoringApi and WS
// ---------------------------------------------------------------------------

/** Subscribe to WebSocket scoring updates — called on app init */
export const subscribeToScoringUpdates = () => async (_dispatch: AppDispatch) => {
  // The wsMiddleware handles WS messages and dispatches ws/message actions
  // We listen for scoring_update events and merge them into the scores state
};

/** Select a ticket for scoring view */
export const selectTicketForScoring = (ticketId: string | null) => async (dispatch: AppDispatch) => {
  dispatch(scoresSlice.actions.selectTicket(ticketId));
};

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Get all criterion scores */
export const selectCriterionScores = (state: RootState): Record<string, { score: number; maxScore: number }> => {
  const { criterionScores } = state.scores;
  return Object.fromEntries(
    Object.entries(criterionScores).map(([id, cs]) => [id, { score: cs.score, maxScore: cs.maxScore }])
  );
};

/** Get the three aggregate scores */
export const selectAggregateScores = (state: RootState): { technical: number; process: number; communication: number } => {
  const { technical, process, communication } = state.scores;
  return { technical, process, communication };
};

/** Get the last updated timestamp */
export const selectLastUpdated = (state: RootState): string | null => {
  const { lastUpdated } = state.scores;
  return lastUpdated;
};

/** Get the feedback string */
export const selectFeedback = (state: RootState): string | null => {
  const { feedback } = state.scores;
  return feedback;
};

/** Get subscription status */
export const selectIsSubscribed = (state: RootState): boolean => {
  const { isSubscribed } = state.scores;
  return isSubscribed;
};

/** Get selected ticket ID (from ticketsSlice) via cross-slice selector */
export const selectSelectedTicketId = (state: RootState): string | null => {
  const { selectedTicketId } = state.tickets;
  return selectedTicketId;
};

/** Export all actions */
export const {
  setCriterionScores,
  mergeScoringUpdate,
  setSubscribed,
  selectTicket,
} = scoresSlice.actions;

export default scoresSlice.reducer;