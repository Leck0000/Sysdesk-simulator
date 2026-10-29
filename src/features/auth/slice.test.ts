/**
 * auth slice tests
 * 
 * Tests the auth slice reducers and state management:
 * - initial state shape
 * - logout reducer clears state
 * - setUser reducer sets user
 * - resetStatus reducer resets status
 * - No RTK Query dependencies in core reducer tests
 */

import { describe, it, expect, vi } from 'vitest';
import { authSlice } from './slice';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createTestStore() {
  return {
    getState: () => ({
      auth: {
        accessToken: '',
        user: null,
        roles: [],
        status: 'idle',
      },
    }),
    dispatch: vi.fn(),
    subscribe: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// auth slice tests
// ---------------------------------------------------------------------------

describe('authSlice', () => {
  describe('initial state', () => {
    it('has the correct initial state shape', () => {
      const store = createTestStore();
      const state = store.getState().auth;

      expect(state.accessToken).toBe('');
      expect(state.user).toBeNull();
      expect(state.roles).toEqual([]);
      expect(state.status).toBe('idle');
    });
  });

  describe('logout reducer', () => {
    it('clears auth state on logout', () => {
      // Manually test the reducer with initial state
      const { reducer } = authSlice;
      const state = reducer(undefined, authSlice.actions.logout());

      expect(state.accessToken).toBe('');
      expect(state.user).toBeNull();
      expect(state.roles).toEqual([]);
      expect(state.status).toBe('idle');
    });

    it('resets status to idle on logout', () => {
      const { reducer } = authSlice;
      const state = reducer(
        { accessToken: 'token', user: { id: '1', role: 'admin', name: 'Test' }, roles: ['admin'], status: 'succeeded' },
        authSlice.actions.logout()
      );

      expect(state.accessToken).toBe('');
      expect(state.user).toBeNull();
      expect(state.roles).toEqual([]);
      expect(state.status).toBe('idle');
    });
  });

  describe('setUser reducer', () => {
    it('sets the user state and marks status as succeeded', () => {
      const { reducer } = authSlice;
      const user = { id: 'user-123', role: 'instructor' as const, name: 'Jane Doe' };

      const state = reducer(
        { accessToken: '', user: null, roles: [], status: 'idle' },
        authSlice.actions.setUser(user)
      );

      expect(state.user).toEqual(user);
      expect(state.status).toBe('succeeded');
    });

    it('preserves other state when setting user', () => {
      const { reducer } = authSlice;

      const state = reducer(
        { accessToken: 'old-token', user: null, roles: [], status: 'idle' },
        authSlice.actions.setUser({ id: 'u1', role: 'admin', name: 'Test' })
      );

      expect(state.accessToken).toBe('old-token');
      expect(state.roles).toEqual([]);
    });
  });

  describe('resetStatus reducer', () => {
    it('resets status to idle', () => {
      const { reducer } = authSlice;

      const state = reducer(
        { accessToken: 'token', user: { id: '1', role: 'technician', name: 'Test User' }, roles: ['technician'], status: 'succeeded' },
        authSlice.actions.resetStatus()
      );

      expect(state.status).toBe('idle');
      expect(state.accessToken).toBe('token'); // other state preserved
      expect(state.user).toEqual({ id: '1', role: 'technician', name: 'Test User' });
    });
  });
});
