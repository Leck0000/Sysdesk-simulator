/** Team slice reducer tests (typed fixtures, no casts) */
import { describe, it, expect } from 'vitest';
import reducer, {
  clearTeamState,
  setSelectedAssignment,
  clearSelectedAssignment,
  addProgressEntry,
  clearProgressStream,
  resetBulkImport,
  setCohort,
  fetchCohort,
  subscribeLabProgressThunk,
} from './slice';
import type { Assignment, CohortStudent, LabProgress } from './api';

type TeamState = ReturnType<typeof reducer>;
const init = (): TeamState => reducer(undefined, { type: '@@INIT' });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = new Date().toISOString();

const student: CohortStudent = {
  id: uuid(1), name: 'Test', role: 'technician', labId: uuid(9), progress: 50, status: 'running', lastActive: now,
};
const assignment: Assignment = {
  id: uuid(2), title: 'Test Assignment', description: '', labId: uuid(9), cohortId: uuid(8), status: 'open', createdAt: now,
};
const progress = (i: number): LabProgress => ({ labId: uuid(i), progress: i % 100, activeMachines: 1, timestamp: now });

describe('Team Slice', () => {
  it('has default values', () => {
    expect(init()).toEqual({
      cohort: [],
      assignments: [],
      progressStream: [],
      bulkImport: null,
      status: 'idle',
      selectedAssignment: null,
      error: null,
    });
  });

  it('clearTeamState resets all team state', () => {
    const dirty: TeamState = {
      cohort: [student],
      assignments: [assignment],
      progressStream: [progress(3)],
      bulkImport: { success: true, imported: 5, failed: 0, errors: [] },
      status: 'succeeded',
      selectedAssignment: assignment,
      error: 'some error',
    };
    expect(reducer(dirty, clearTeamState())).toEqual(init());
  });

  describe('setSelectedAssignment', () => {
    it('sets the selected assignment', () => {
      const state = reducer(init(), setSelectedAssignment(assignment));
      expect(state.selectedAssignment).toEqual(assignment);
    });
  });

  describe('clearSelectedAssignment', () => {
    it('clears the selected assignment', () => {
      const selected: TeamState = { ...init(), selectedAssignment: assignment };
      expect(reducer(selected, clearSelectedAssignment()).selectedAssignment).toBeNull();
    });
  });

  describe('addProgressEntry', () => {
    it('adds a progress entry to the stream', () => {
      const entry = progress(1);
      const state = reducer(init(), addProgressEntry(entry));
      expect(state.progressStream).toEqual([entry]);
    });

    it('bounds the stream at 100 entries, dropping the oldest', () => {
      let state = init();
      for (let i = 0; i < 101; i++) state = reducer(state, addProgressEntry(progress(i)));
      expect(state.progressStream).toHaveLength(100);
      expect(state.progressStream[0]?.labId).toBe(uuid(1));
    });
  });

  it('clearProgressStream empties the stream', () => {
    const state = reducer(reducer(init(), addProgressEntry(progress(1))), clearProgressStream());
    expect(state.progressStream).toEqual([]);
  });

  it('resetBulkImport clears the result and status', () => {
    const dirty: TeamState = { ...init(), bulkImport: { success: true, imported: 5, failed: 0, errors: [] }, status: 'succeeded' };
    const state = reducer(dirty, resetBulkImport());
    expect(state.bulkImport).toBeNull();
    expect(state.status).toBe('idle');
  });

  describe('roster loading (fetchCohort / setCohort)', () => {
    it('fetchCohort.pending marks loading and clears a previous error', () => {
      const state = reducer({ ...init(), error: 'old' }, fetchCohort.pending('r1', undefined));
      expect(state.status).toBe('loading');
      expect(state.error).toBeNull();
    });

    it('fetchCohort.fulfilled stores the roster', () => {
      const state = reducer(init(), fetchCohort.fulfilled([student], 'r1', undefined));
      expect(state.cohort).toEqual([student]);
      expect(state.status).toBe('succeeded');
    });

    it('fetchCohort.rejected records the error', () => {
      const state = reducer(init(), fetchCohort.rejected(null, 'r1', undefined, 'Failed to fetch cohort'));
      expect(state.status).toBe('failed');
      expect(state.error).toBe('Failed to fetch cohort');
    });

    it('setCohort replaces the roster and marks it loaded', () => {
      const state = reducer({ ...init(), status: 'failed', error: 'x' }, setCohort([student]));
      expect(state).toMatchObject({ cohort: [student], status: 'succeeded', error: null });
    });

    it('subscribeLabProgressThunk.fulfilled seeds the progress stream', () => {
      const entries = [progress(1), progress(2)];
      const state = reducer(init(), subscribeLabProgressThunk.fulfilled(entries, 'r1', 'lab'));
      expect(state.progressStream).toEqual(entries);
    });
  });
});
