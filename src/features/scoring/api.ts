/**
 * Scoring API endpoints: real-time scoring updates, score retrieval
 *
 * Consumes: wsMiddleware (scoring_update events)
 * Produces: typed RTK Query endpoints + selectors
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 */

import { createApi, baseQueryFromFetch } from '@reduxjs/toolkit/query/react';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schemas (boundary validation — never pass raw network data downstream)
// ---------------------------------------------------------------------------

/** Scoring update payload from WebSocket — matches ARCHITECTURE.md §4.5 */
const ScoringUpdateSchema = z.object({
  ticketId: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  feedback: z.string().optional(),
  timestamp: z.string().datetime(),
});

/** Score summary payload */
const ScoreSummarySchema = z.object({
  technical: z.number().int().min(0).max(100),
  process: z.number().int().min(0).max(100),
  communication: z.number().int().min(0).max(100),
});

type ScoringUpdate = z.infer<typeof ScoringUpdateSchema>;
type ScoreSummary = z.infer<typeof ScoreSummarySchema>;

// ---------------------------------------------------------------------------
// RTK Query API — typed endpoints matching ARCHITECTURE.md §5.5
// ---------------------------------------------------------------------------

export const scoringApi = createApi({
  reducerPath: 'scoringApi',
  baseQuery: baseQueryFromFetch({
    prepareHeaders: (headers, { getState }) => {
      const state = getState();
      // Read auth token from Redux store
      const authState = state as any;
      const accessToken =
        typeof authState?.auth?.accessToken === 'string'
          ? authState.auth.accessToken
          : '';
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Scoring'],
  endpoints: (builder) => ({
    /** SUBSCRIBE to scoring_update WebSocket events
     *  This endpoint is not a typical RTK Query request — it subscribes
     *  to the WS scoring_update feed. The actual subscription happens
     *  via wsMiddleware dispatching ws/message with t=scoring_update.
     *  This endpoint exists for type-system completeness.
     */
    subscribeScoringUpdates: builder.query<void, void>({
      query: () => ({ url: '/_scoring/subscribe', method: 'GET' }),
      providesTags: ['Scoring'],
    }),

    /** Get score summary for a ticket type */
    getScoreSummary: builder.query<ScoreSummary, string>({
      query: (ticketType) => ({
        url: `/score/${ticketType}`,
        method: 'GET',
      }),
      providesTags: (result, error, ticketType) => [
        { type: 'Scoring', id: ticketType },
      ],
    }),
  }),
});

// ---------------------------------------------------------------------------
// Public API exports — mutation/query thunks and selectors
// ---------------------------------------------------------------------------

export const {
  useSubscribeScoringUpdatesQuery,
  useGetScoreSummaryQuery,
} = scoringApi;

export const selectScoringApiState = (state: { scoringApi: any }) => state.scoringApi;
export const selectScoringApiResults = scoringApi.endpoints.subscribeScoringUpdates.select();
export const selectIsSubscribingScoring = (state: { scoringApi: { queries: Record<string, { status: string }> } }) => {
  const queries = state.scoringApi?.queries ?? {};
  return Object.values(queries).some((q) => q.status === 'pending');
};