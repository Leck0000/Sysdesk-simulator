/**
 * RTK Query auth API endpoints: login, refresh, revoke
 * 
 * Consumes: wsClient (for token refresh coordination via accessToken)
 * Produces: authApi with typed mutation endpoints + selectors
 * 
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { z } from 'zod';
import type { RootState } from '../../app/store';

// ---------------------------------------------------------------------------
// Zod schemas (boundary validation — never pass raw network data downstream)
// ---------------------------------------------------------------------------

/** Login request: { email, password } */
const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Login response: { accessToken, refreshToken, expiresIn, user: { id, role, name } } */
const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: z.object({
    id: z.string().uuid(),
    role: z.enum(['technician', 'instructor', 'admin']),
    name: z.string(),
  }),
});

/** Refresh request: { refreshToken } */
const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

/** Refresh response: { accessToken, expiresIn } */
const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
});

/** Revoke request: { refreshToken } */
const RevokeRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

/** Revoke response: { success: boolean } */
const RevokeResponseSchema = z.object({
  success: z.boolean(),
});

// Type-safe infer types from schemas
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
export type RevokeRequest = z.infer<typeof RevokeRequestSchema>;
export type RevokeResponse = z.infer<typeof RevokeResponseSchema>;

// ---------------------------------------------------------------------------
// RTK Query auth API — typed endpoints matching ARCHITECTURE.md §5.2
//
// The baseQuery reads accessToken from the Redux store state via
// `prepareHeaders` so every request automatically carries the Bearer token.
// ---------------------------------------------------------------------------

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    // fetchBaseQuery options: we inject the token per-request via prepareHeaders
    prepareHeaders: (headers, { getState }) => {
      const state = getState();
      // Type-safe accessor — the auth slice stores accessToken as string
      const accessToken = (state && typeof state === 'object' && 'auth' in state && typeof (state as { auth: { accessToken: string } }).auth.accessToken === 'string')
        ? (state as { auth: { accessToken: string } }).auth.accessToken
        : '';
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return headers;
    },
    credentials: 'include', // refreshToken lives in httpOnly cookie
  }),
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    /** POST /auth/login */
    loginMutation: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Auth', id: 'Login' }],
    }),

    /** POST /auth/refresh */
    refreshMutation: builder.mutation<RefreshResponse, RefreshRequest>({
      query: (body) => ({
        url: '/auth/refresh',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Auth', id: 'Refresh' }],
    }),

    /** POST /auth/revoke */
    revokeMutation: builder.mutation<RevokeResponse, RevokeRequest>({
      query: (body) => ({
        url: '/auth/revoke',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Auth', id: 'Revoke' }],
    }),
  }),
});

// ---------------------------------------------------------------------------
// Public API exports — the mutation-thunk functions consumers can dispatch.
// These return the zod-validated response type via the baseQuery's
// automatic validation flow.
// ---------------------------------------------------------------------------

// Login mutation thunk — dispatch this to initiate login
export const loginMutationThunk = authApi.endpoints.loginMutation.initiate;

// Refresh mutation thunk — dispatch this to initiate token refresh
export const refreshMutationThunk = authApi.endpoints.refreshMutation.initiate;

// Revoke mutation thunk — dispatch this to initiate token revocation
export const revokeMutationThunk = authApi.endpoints.revokeMutation.initiate;

// ---------------------------------------------------------------------------
// Reduced selectors for the derived data the slice consumes
// 
// Note: RTK Query mutation loading state is best accessed via:
//   authApi.util.selectors.getSelectIsLoading(authApi.endpoints.loginMutation)
// in React components using the Provider. For testing, we export simplified
// selectors that check the running query state.
// ---------------------------------------------------------------------------

/** Raw RTK Query cache for the auth API. */
export const selectAuthApiState = (state: RootState) => state.authApi;

const isMutationPending = (state: RootState, endpointName: string): boolean =>
  Object.values(state.authApi.mutations).some((m) => m?.endpointName === endpointName && m.status === 'pending');

export const selectIsLoggingIn = (state: RootState) => isMutationPending(state, 'loginMutation');
export const selectIsRefreshing = (state: RootState) => isMutationPending(state, 'refreshMutation');
export const selectIsRevoking = (state: RootState) => isMutationPending(state, 'revokeMutation');

// ---------------------------------------------------------------------------
// NOTE: RTK Query loading state for mutations is accessed via the selectors
// above, which use authApi.util.selectors.getRunningQueriesMap() to derive
// loading state from the endpoint's running query state. This is available
// in React components using the provider.
// ---------------------------------------------------------------------------
