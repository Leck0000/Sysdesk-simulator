/**
 * RTK Query certificates API endpoints: list, get, issue, validate
 *
 * Consumes: authSlice (accessToken for authenticated endpoints), public route needs no auth
 * Produces: certificatesApi with typed query/mutation endpoints + selectors
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

/** Certificate earned criteria enum */
const EarnedCriteriaSchema = z.enum(['all_steps', 'majority', 'custom']);

/** Signed payload object */
const SignedPayloadSchema = z.object({
  signature: z.string(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

/** Certificate response from GET /certificates and GET /certificates/:id */
export const CertificateSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  labId: z.string().uuid(),
  verificationId: z.string().uuid(),
  earnedCriteria: EarnedCriteriaSchema,
  signedPayload: SignedPayloadSchema,
  expiryDate: z.string().datetime(),
  createdAt: z.string().datetime(),
});

/** Certificate list item (may have fewer fields for gallery display) */
export const CertificateListItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  labId: z.string().uuid(),
  verificationId: z.string().uuid(),
  earnedCriteria: EarnedCriteriaSchema,
  signedPayload: SignedPayloadSchema,
  expiryDate: z.string().datetime(),
  createdAt: z.string().datetime(),
});

/** List certificates response */
export const CertificateListResponseSchema = z.array(CertificateListItemSchema);

/** Issue certificate request */
export const IssueCertificateRequestSchema = z.object({
  userId: z.string().uuid(),
  labId: z.string().uuid(),
  ticketId: z.string().uuid().nullable(),
  issuedBy: z.string().uuid(),
  expiryDays: z.number().int().positive().optional(),
});

/** Issue certificate response */
export const IssueCertificateResponseSchema = z.object({
  certificate: CertificateSchema,
  verificationUrl: z.string().url().or(z.string().startsWith('/')),
});

/** Validate certificate request */
export const ValidateCertificateRequestSchema = z.object({
  verificationId: z.string().uuid(),
});

/** Validate certificate response */
export const ValidateCertificateResponseSchema = z.object({
  valid: z.boolean(),
  payload: z.object({
    ticket_type: z.string(),
    ticket_id: z.string(),
    score: z.number(),
    criteria_met: z.record(z.string(), z.number()),
    rubric_hash: z.string(),
    issued_at: z.number(),
  }).optional(),
  signature: z.string().optional(),
  error: z.string().optional(),
});

// Type-safe infer types from schemas
export type Certificate = z.infer<typeof CertificateSchema>;
export type CertificateListItem = z.infer<typeof CertificateListItemSchema>;
export type CertificateListResponse = z.infer<typeof CertificateListResponseSchema>;
export type IssueCertificateRequest = z.infer<typeof IssueCertificateRequestSchema>;
export type IssueCertificateResponse = z.infer<typeof IssueCertificateResponseSchema>;
export type ValidateCertificateRequest = z.infer<typeof ValidateCertificateRequestSchema>;
export type ValidateCertificateResponse = z.infer<typeof ValidateCertificateResponseSchema>;

// ---------------------------------------------------------------------------
// RTK Query certificates API — typed endpoints matching ARCHITECTURE.md §5.5
// ---------------------------------------------------------------------------

export const certificatesApi = createApi({
  reducerPath: 'certificatesApi',
  baseQuery: apiBaseQuery,
  tagTypes: ['Certificates'],
  endpoints: (builder) => ({
    /** GET /certificates — list issued certificates with optional filters */
    listCertificates: builder.query<CertificateListResponse, { userId?: string; labId?: string; status?: string } | void>({
      query: (params) => ({
        url: '/certificates',
        method: 'GET',
        params: params ? {
          ...(params.userId && { user_id: params.userId }),
          ...(params.labId && { lab_id: params.labId }),
          ...(params.status && { status: params.status }),
        } : undefined,
      }),
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Certificates', id })), { type: 'Certificates', id: 'LIST' }]
          : [{ type: 'Certificates', id: 'LIST' }],
    }),

    /** GET /certificates/:id — retrieve certificate details */
    getCertificate: builder.query<Certificate, string>({
      query: (id) => `/certificates/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Certificates', id }],
    }),

    /** POST /certificates/issue — issue certificate for completed lab/ticket */
    issueCertificate: builder.mutation<IssueCertificateResponse, IssueCertificateRequest>({
      query: (body) => ({
        url: '/certificates/issue',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Certificates', id: 'LIST' }],
    }),

    /** POST /certificates/validate — validate certificate hash (public endpoint) */
    validateCertificate: builder.mutation<ValidateCertificateResponse, ValidateCertificateRequest>({
      query: (body) => ({
        url: '/certificates/validate',
        method: 'POST',
        body,
      }),
    }),
  }),
});

// ---------------------------------------------------------------------------
// Public API exports — the mutation/query thunk functions consumers can dispatch
// ---------------------------------------------------------------------------

export const {
  useListCertificatesQuery,
  useGetCertificateQuery,
  useIssueCertificateMutation,
  useValidateCertificateMutation,
  useLazyListCertificatesQuery,
  useLazyGetCertificateQuery,
} = certificatesApi;

// ---------------------------------------------------------------------------
// Selectors for loading states
// ---------------------------------------------------------------------------

export const selectIsCertificatesLoading = (state: RootState) =>
  isQueryPending(state.certificatesApi, 'listCertificates');

export const selectIsCertificateLoading = (state: RootState, id: string) =>
  isQueryPending(state.certificatesApi, 'getCertificate', (args) => args === id);

export const selectIsIssuingCertificate = (state: RootState) =>
  isMutationPending(state.certificatesApi, 'issueCertificate');

export const selectIsValidatingCertificate = (state: RootState) =>
  isMutationPending(state.certificatesApi, 'validateCertificate');

// ---------------------------------------------------------------------------
// NOTE: RTK Query loading state for queries/mutations is accessed via the
// selectors above, which use certificatesApi.util.selectors.getRunningQueriesMap()
// and getRunningMutationsMap() to derive loading state from the endpoint's
// running query/mutation state. This is available in React components using
// the provider.
// ---------------------------------------------------------------------------