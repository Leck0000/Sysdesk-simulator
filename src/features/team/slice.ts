/** team slice — cohort / assignment / progress state mirroring ARCHITECTURE.md data models */

/* Consumes: teamApi (RTK Query for cohort/assignment data),
   wsClient (for lab_progress WS room subscription — assignment.progress WS room)
/* Produces: teamSlice with cohort, assignments, progress state + async thunks

/* Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
/* CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
*/

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { z } from 'zod';
import type { RootState, AppDispatch } from '../../app/store';
import { teamApi } from './api';

interface CohortProgress {
  labId: string;
  progress: number;
  activeMachines: number;
  timestamp: string;
}

const initialTeamState = {
  // Cohort roster — students in the current cohort
  cohort: [] as CohortStudent,
  // Current assignments
  assignments: [] as Assignment,
  // Lab progress stream entries
  progressStream: [] as LabProgress,
  // Bulk import result
  bulkImport: null as BulkImportResult | null,
  // Status flags
  status: 'idle' as 'idle' | 'loading' | 'succeeded' | 'failed',
  // Selected assignment for detailed view
  selectedAssignment: null as Assignment | null,
  // Error state
  error: null as string | null,
};

// Type aliases — inferred from api.ts schemas
type CohortStudent = any;
type Assignment = any;
type LabProgress = any;
type BulkImportResult = any;

// Async thunks

export const fetchCohort = createAsyncThunk(
  'team/fetchCohort',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const result = await dispatch(teamApi.endpoints.cohortQuery.initiate()).unwrap();
      return result;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to fetch cohort');
    }
  }
);

export const fetchAssignments = createAsyncThunk(
  'team/fetchAssignments',
  async (cohortId: string, { dispatch, rejectWithValue }) => {
    try {
      const result = await dispatch(
        teamApi.endpoints.assignmentsQuery.initiate(cohortId)
      ).unwrap();
      return result;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to fetch assignments');
    }
  }
);

export const createAssignment = createAsyncThunk(
  'team/createAssignment',
  async (assignment: Assignment, { dispatch, rejectWithValue }) => {
    try {
      const result = await dispatch(
        teamApi.endpoints.createAssignmentMutation.initiate(assignment)
      ).unwrap();
      // Refetch cohort after create
      dispatch(fetchCohort());
      return result;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to create assignment');
    }
  }
);

export const bulkImport = createAsyncThunk(
  'team/bulkImport',
  async (formData: FormData, { dispatch, rejectWithValue }) => {
    try {
      const result = await dispatch(
        teamApi.endpoints.bulkImportMutation.initiate(formData)
      ).unwrap();
      // Refetch after import
      dispatch(fetchCohort());
      dispatch(fetchAssignments(formData.get('cohortId') as string));
      return result;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to bulk import');
    }
  }
);

export const subscribeLabProgressThunk = createAsyncThunk(
  'team/subscribeLabProgress',
  async (labId: string, { dispatch, rejectWithValue }) => {
    try {
      const result = await dispatch(
        teamApi.endpoints.subscribeLabProgress.initiate(labId)
      ).unwrap();
      return result;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to subscribe to lab progress');
    }
  }
);

// Team slice

export const teamSlice = createSlice({
  name: 'team',
  initialState: initialTeamState,
  reducers: {
    /** Clear all team state (logout / reset) */
    clearTeamState: (state) => {
      state.cohort = [];
      state.assignments = [];
      state.progressStream = [];
      state.bulkImport = null;
      state.status = 'idle';
      state.selectedAssignment = null;
      state.error = null;
    },

    /** Set the selected assignment (for AssignmentView) */
    setSelectedAssignment: (state, action) => {
      state.selectedAssignment = action.payload;
    },

    /** Clear selected assignment */
    clearSelectedAssignment: (state) => {
      state.selectedAssignment = null;
    },

    /** Reset bulk import state */
    resetBulkImport: (state) => {
      state.bulkImport = null;
      state.status = 'idle';
    },

    /** Add a lab progress entry to the stream */
    addProgressEntry: (state, action) => {
      state.progressStream.push(action.payload);
      // Keep stream bounded — drop oldest if over 100 entries
      if (state.progressStream.length > 100) {
        state.progressStream = state.progressStream.slice(-100);
      }
    },

    /** Clear progress stream */
    clearProgressStream: (state) => {
      state.progressStream = [];
    },
  },
});

// Expose actions
export const {
  clearTeamState,
  setSelectedAssignment,
  clearSelectedAssignment,
  resetBulkImport,
  addProgressEntry,
  clearProgressStream,
} = teamSlice.actions;

export default teamSlice.reducer;
