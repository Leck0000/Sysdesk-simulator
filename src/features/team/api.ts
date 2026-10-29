/** Team RTK Query API endpoints: cohort data, assignments, progress subscription */

/* Consumes: wsClient (for lab_progress WS room subscription)
 * Produces: typed endpoints + selectors for team feature
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { apiBaseQuery } from '../../shared/api/baseQuery';
import { isMutationPending, isQueryPending } from '../../shared/api/pending';
import type { RootState } from '../../app/store';
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
  baseQuery: apiBaseQuery,
  tagTypes: ['Team'],
  endpoints: (builder) => ({
    /** GET /team/cohort — fetch current cohort roster */
    cohortQuery: builder.query<CohortStudent[], void>({
      // Validate the server response (and args) at the boundary.
      responseSchema: z.array(CohortStudentSchema),
      query: () => ({
        url: '/team/cohort',
        method: 'GET',
      }),
      providesTags: ['Team'],
    }),

    /** GET /team/assignments — fetch all assignments for a cohort */
    assignmentsQuery: builder.query<Assignment[], string>({
      // Validate the server response (and args) at the boundary.
      responseSchema: z.array(AssignmentSchema),
      query: (cohortId) => ({
        url: `/team/assignments?cohortId=${cohortId}`,
        method: 'GET',
      }),
      providesTags: ['Team'],
    }),

    /** POST /team/assignments — create a new assignment */
    createAssignmentMutation: builder.mutation<Assignment, Assignment>({
      // Validate the server response (and args) at the boundary.
      responseSchema: AssignmentSchema,
      argSchema: AssignmentSchema,
      query: (body) => ({
        url: '/team/assignments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Team'],
    }),

    /** POST /team/bulk-import — CSV/Multipart upload for assignments */
    bulkImportMutation: builder.mutation<BulkImportResult, FormData>({
      // Validate the server response (and args) at the boundary.
      // Schema has defaults (input != output): validate the raw body (handled SchemaError on
      // mismatch), then parse to apply defaults and get the output type.
      rawResponseSchema: BulkImportResultSchema,
      transformResponse: (raw: unknown) => BulkImportResultSchema.parse(raw),
      query: (body) => ({
        url: '/team/bulk-import',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Team'],
    }),

    /** Subscribe to lab_progress WS events for a lab */
    subscribeLabProgress: builder.query<LabProgress[], string>({
      // Validate the server response (and args) at the boundary.
      responseSchema: z.array(LabProgressSchema),
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

export const selectIsCohortLoading = (state: RootState) => isQueryPending(state.teamApi, 'cohortQuery');
export const selectIsAssignmentsLoading = (state: RootState) => isQueryPending(state.teamApi, 'assignmentsQuery');
export const selectIsBulkImportLoading = (state: RootState) => isMutationPending(state.teamApi, 'bulkImportMutation');
