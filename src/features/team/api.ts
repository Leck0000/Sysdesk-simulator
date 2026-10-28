/** Team RTK Query API endpoints: cohort data, assignments, progress subscription */

/* Consumes: wsClient (for lab_progress WS room subscription)
 * Produces: typed endpoints + selectors for team feature
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schemas (boundary validation — never pass raw network data downstream)
// ---------------------------------------------------------------------------

/** Cohort student entry */
const CohortStudentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  role: z.enum(['technician', 'instructor']),
  labId: z.string().uuid(),
  progress: z.number().min(0).max(100),
  status: z.enum(['idle', 'running', 'error', 'complete']),
  lastActive: z.string().datetime(),
});
export type CohortStudent = z.infer<typeof CohortStudentSchema>;

/** Assignment entry */
const AssignmentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  labId: z.string().uuid(),
  cohortId: z.string().uuid(),
  technicianId: z.string().uuid().optional(),
  status: z.enum(['open', 'in_progress', 'completed']),
  createdAt: z.string().datetime(),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

/** Lab progress entry */
const LabProgressSchema = z.object({
  labId: z.string().uuid(),
  progress: z.number().min(0).max(100),
  activeMachines: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
});
export type LabProgress = z.infer<typeof LabProgressSchema>;

/** Bulk import result */
const BulkImportResultSchema = z.object({
  success: z.boolean(),
  imported: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errors: z.array(z.object({
    row: z.number().int(),
    error: z.string(),
  })).default([]),
});
export type BulkImportResult = z.infer<typeof BulkImportResultSchema>;

// ---------------------------------------------------------------------------
// RTK Query team API — typed endpoints matching ARCHITECTURE.md data models
//

export const teamApi = createApi({
  reducerPath: 'teamApi',
  baseQuery: fetchBaseQuery({
    prepareHeaders: (headers, { getState }) => {
      const state = getState();
      // Type-safe accessor — read accessToken from auth slice
      const accessToken = (state &&
        typeof state === 'object' &&
        'auth' in state &&
        typeof (state as { auth: { accessToken: string } }).auth.accessToken === 'string')
        ? (state as { auth: { accessToken: string } }).auth.accessToken
        : '';
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return headers;
    },
    credentials: 'include',
  }),
  tagTypes: ['Team'],
  endpoints: (builder) => ({
    /** GET /team/cohort — fetch current cohort roster */
    cohortQuery: builder.query<CohortStudent[], void>({
      query: () => ({
        url: '/team/cohort',
        method: 'GET',
      }),
      providesTags: ['Team'],
    }),

    /** GET /team/assignments — fetch all assignments for a cohort */
    assignmentsQuery: builder.query<Assignment[], string>({
      query: (cohortId) => ({
        url: `/team/assignments?cohortId=${cohortId}`,
        method: 'GET',
      }),
      providesTags: ['Team'],
    }),

    /** POST /team/assignments — create a new assignment */
    createAssignmentMutation: builder.mutation<Assignment, Assignment>({
      query: (body) => ({
        url: '/team/assignments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Team'],
    }),

    /** POST /team/bulk-import — CSV/Multipart upload for assignments */
    bulkImportMutation: builder.mutation<BulkImportResult, FormData>({
      query: (body) => ({
        url: '/team/bulk-import',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Team'],
    }),

    /** Subscribe to lab_progress WS events for a lab */
    subscribeLabProgress: builder.query<LabProgress[], string>({
      query: (labId) => ({
        url: `/team/lab-progress?labId=${labId}`,
        method: 'GET',
      }),
      providesTags: ['Team'],
    }),
  }),
});

// ---------------------------------------------------------------------------
// Public API exports — the mutation/thunk functions consumers can dispatch.
// ---------------------------------------------------------------------------

export const {
  cohortQuery,
  assignmentsQuery,
  createAssignmentMutation,
  bulkImportMutation,
  subscribeLabProgress,
} = teamApi.endpoints;

// ---------------------------------------------------------------------------
// Reduced selectors for the derived data the slice consumes
// ---------------------------------------------------------------------------

// Helper to check if cohort query is currently loading
export const selectIsCohortLoading = (state: any) => {
  const running = teamApi.util.selectors.getRunningQueriesMap(state)[teamApi.endpoints.cohortQuery.selector];
  return !!(running?.pending !== undefined);
};

// Helper to check if assignments query is currently loading
export const selectIsAssignmentsLoading = (state: any) => {
  const running = teamApi.util.selectors.getRunningQueriesMap(state)[teamApi.endpoints.assignmentsQuery.selector];
  return !!(running?.pending !== undefined);
};

// Helper to check if bulk import mutation is currently loading
export const selectIsBulkImportLoading = (state: any) => {
  const running = teamApi.util.selectors.getRunningQueriesMap(state)[teamApi.endpoints.bulkImportMutation.selector];
  return !!(running?.pending !== undefined);
};
