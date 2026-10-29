/** Team slice reducer tests (typed fixtures, no casts) */
import { describe, it, expect } from 'vitest';
import reducer, {
  clearTeamState,
  setSelectedAssignment,
  clearSelectedAssignment,
  addProgressEntry,
  clearProgressStream,
  resetBulkImport,
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

  it('setSelectedAssignment / clearSelectedAssignment', () => {
    let state = reducer(init(), setSelectedAssignment(assignment));
    expect(state.selectedAssignment).toEqual(assignment);
    state = reducer(state, clearSelectedAssignment());
    expect(state.selectedAssignment).toBeNull();
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
});
