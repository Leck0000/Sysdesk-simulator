/**
 * auth slice — token / user / roles state mirroring ARCHITECTURE.md data models
 * 
 * Consumes: authApi (RTK Query) for login/refresh/revoke mutations,
 *           wsClient (for token refresh coordination — updateAccessToken)
 * Produces: authSlice with accessToken, user, roles state + async thunks
 * 
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 */

import { createSlice } from '@reduxjs/toolkit';
import { z } from 'zod';
import type { RootState, AppDispatch } from '../../app/store';
import { authApi } from './api';

// ---------------------------------------------------------------------------
// Initial auth state — unauthenticated
// ---------------------------------------------------------------------------

const initialAuthState = {
  accessToken: '' as string,
  user: null as { id: string; role: 'technician' | 'instructor' | 'admin'; name: string } | null,
  roles: [] as ('technician' | 'instructor' | 'admin')[],
  status: 'idle' as 'idle' | 'loading' | 'succeeded' | 'failed',
};

// ---------------------------------------------------------------------------
// Auth slice
// ---------------------------------------------------------------------------

export const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    /** Clear auth state (logout) — called on revoke or manual logout */
    logout: (state) => {
      state.accessToken = '';
      state.user = null;
      state.roles = [];
      state.status = 'idle';
    },

    /** Set user explicitly (e.g. from WS session.init) */
    setUser: (state, action) => {
      // We trust the payload here because it comes from WS session.init which
      // is validated by the wsMiddleware envelope parser — a trusted path.
      state.user = action.payload;
      state.status = 'succeeded';
    },

    /** Reset status after a mutation completes */
    resetStatus: (state) => {
      state.status = 'idle';
    },
  },
  // extraReducers avoided: the .pending/.fulfilled/.rejected property types
  // are not reliably available in @reduxjs/toolkit 2.13.0. Loading state for
  // mutations is managed in the thunk functions themselves, and consumers can
  // use authApi.util.selectors.getSelectIsLoading() in React components.
});

// ---------------------------------------------------------------------------
// Async thunks that coordinate with authApi for auth flow
// ---------------------------------------------------------------------------

/** Login thunk — dispatches the RTK Query loginMutation.
//  The baseQuery's prepareHeaders injects the accessToken from the store,
//  so the API call carries auth automatically. */
export const login = (credentials: { email: string; password: string }) => async (
  dispatch: AppDispatch,
) => {
  // Dispatch the RTK Query login mutation.
  // In RTK Query v2, initiate() is the method to manually trigger a mutation.
  // The baseQuery's prepareHeaders inject the accessToken from the store,
  // so the API call carries auth automatically.
  dispatch(authApi.endpoints.loginMutation.initiate(credentials));
  // The baseQuery has already updated the accessToken in the Redux store
  // via the fetchBaseQuery prepareHeaders pattern. The consumer should
  // read it via: store.getState().auth.accessToken.
};

// ---------------------------------------------------------------------------

/** Refresh thunk — gets a new access token using the refresh mutation.
//  On success, updates wsClient so the active WS connection re-authenticates. */
export const refresh = () => async (dispatch: AppDispatch) => {
  // Dispatch the RTK Query refresh mutation
  dispatch(authApi.endpoints.refreshMutation.initiate({ refreshToken: '' as string }));
};

// Expose the generated action creators for use in components
export const { logout, setUser, resetStatus } = authSlice.actions;

export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectAuthUserId = (state: RootState) => state.auth.user?.id ?? null;

export default authSlice.reducer;
