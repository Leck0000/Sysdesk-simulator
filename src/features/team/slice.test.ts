/** Team slice reducer tests */
/* Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA. */

import { describe, it, expect } from 'vitest';
import { teamSlice } from './slice';

describe('Team Slice', () => {
  describe('initial state', () => {
    it('should have default values', () => {
      const initialState = teamSlice.reducer(undefined, { type: '@@INIT' });
      expect(initialState.cohort).toEqual([]);
      expect(initialState.assignments).toEqual([]);
      expect(initialState.progressStream).toEqual([]);
      expect(initialState.bulkImport).toBeNull();
      expect(initialState.status).toBe('idle');
      expect(initialState.selectedAssignment).toBeNull();
      expect(initialState.error).toBeNull();
    });
  });

  describe('clearTeamState', () => {
    it('should reset all team state', () => {
      const state = {
        cohort: [{ id: '1', name: 'Test', progress: 50, status: 'running' }],
        assignments: [{ id: '2', title: 'Test', status: 'open' }],
        progressStream: [{ labId: '3', progress: 25, activeMachines: 1 }],
        bulkImport: { success: true, imported: 5, failed: 0 },
        status: 'succeeded',
        selectedAssignment: { id: '4', title: 'Test' },
        error: 'some error',
      } as any;

      const action = { type: teamSlice.actions.clearTeamState.type };
      const nextState = teamSlice.reducer(state, action);

      expect(nextState.cohort).toEqual([]);
      expect(nextState.assignments).toEqual([]);
      expect(nextState.progressStream).toEqual([]);
      expect(nextState.bulkImport).toBeNull();
      expect(nextState.status).toBe('idle');
      expect(nextState.selectedAssignment).toBeNull();
      expect(nextState.error).toBeNull();
    });
  });

  describe('setSelectedAssignment', () => {
    it('should set the selected assignment', () => {
      const state = { selectedAssignment: null } as any;

      const action = {
        type: teamSlice.actions.setSelectedAssignment.type,
        payload: { id: '1', title: 'Test Assignment' },
      };

      const nextState = teamSlice.reducer(state, action);
      expect(nextState.selectedAssignment).toEqual(action.payload);
    });
  });

  describe('clearSelectedAssignment', () => {
    it('should clear the selected assignment', () => {
      const state = { selectedAssignment: { id: '1', title: 'Test' } } as any;

      const action = { type: teamSlice.actions.clearSelectedAssignment.type };

      const nextState = teamSlice.reducer(state, action);
      expect(nextState.selectedAssignment).toBeNull();
    });
  });

  describe('addProgressEntry', () => {
    it('should add a progress entry to the stream', () => {
      const state = { progressStream: [] } as any;

      const entry = { labId: '1', progress: 50, activeMachines: 1, timestamp: new Date().toISOString() };

      const action = {
        type: teamSlice.actions.addProgressEntry.type,
        payload: entry,
      };

      const nextState = teamSlice.reducer(state, action);
      expect(nextState.progressStream).toHaveLength(1);
      expect(nextState.progressStream[0]).toEqual(entry);
    });

    it('should bounded the stream at 100 entries', () => {
      const state = { progressStream: [] } as any;

      for (let i = 0; i < 101; i++) {
        const action = {
          type: teamSlice.actions.addProgressEntry.type,
          payload: { labId: String(i), progress: i, activeMachines: 1, timestamp: new Date().toISOString() },
        };
        teamSlice.reducer(state, action);
      }

      expect(state.progressStream).toHaveLength(100);
    });
  });

  describe('clearProgressStream', () => {
    it('should clear the progress stream', () => {
      const state = {
        progressStream: [{ labId: '1', progress: 50, activeMachines: 1, timestamp: new Date().toISOString() }],
      } as any;

      const action = { type: teamSlice.actions.clearProgressStream.type };

      const nextState = teamSlice.reducer(state, action);
      expect(nextState.progressStream).toEqual([]);
    });
  });

  describe('resetBulkImport', () => {
    it('should reset bulk import state', () => {
      const state = {
        bulkImport: { success: true, imported: 5, failed: 0, errors: [] },
        status: 'succeeded',
      } as any;

      const action = { type: teamSlice.actions.resetBulkImport.type };

      const nextState = teamSlice.reducer(state, action);
      expect(nextState.bulkImport).toBeNull();
      expect(nextState.status).toBe('idle');
    });
  });
});
