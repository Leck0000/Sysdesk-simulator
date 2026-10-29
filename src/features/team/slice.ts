/** team slice — cohort / assignment / progress state mirroring ARCHITECTURE.md data models */

/* Consumes: teamApi (RTK Query for cohort/assignment data),
   wsClient (for lab_progress WS room subscription — assignment.progress WS room)
/* Produces: teamSlice with cohort, assignments, progress state + async thunks

/* Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
/* CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
*/

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { teamApi, type Assignment, type BulkImportResult, type CohortStudent, type LabProgress } from './api';

/** Message from an RTK Query / thrown error, for rejectWithValue. */
const errorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'error' in err && typeof err.error === 'string') return err.error;
  return fallback;
};

const initialTeamState = {
  // Cohort roster — students in the current cohort
  cohort: [] as CohortStudent[],
  // Current assignments
  assignments: [] as Assignment[],
  // Lab progress stream entries
  progressStream: [] as LabProgress[],
  // Bulk import result
  bulkImport: null as BulkImportResult | null,
  // Status flags
  status: 'idle' as 'idle' | 'loading' | 'succeeded' | 'failed',
  // Selected assignment for detailed view
  selectedAssignment: null as Assignment | null,
  // Error state
  error: null as string | null,
};


// Async thunks

export const fetchCohort = createAsyncThunk(
  'team/fetchCohort',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const result = await dispatch(teamApi.endpoints.cohortQuery.initiate()).unwrap();
      return result;
    } catch (err: unknown) {
      return rejectWithValue(errorMessage(err, 'Failed to fetch cohort'));
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
    } catch (err: unknown) {
      return rejectWithValue(errorMessage(err, 'Failed to fetch assignments'));
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
    } catch (err: unknown) {
      return rejectWithValue(errorMessage(err, 'Failed to create assignment'));
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
      const cohortId = formData.get('cohortId');
      if (typeof cohortId === 'string') dispatch(fetchAssignments(cohortId));
      return result;
    } catch (err: unknown) {
      return rejectWithValue(errorMessage(err, 'Failed to bulk import'));
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
    } catch (err: unknown) {
      return rejectWithValue(errorMessage(err, 'Failed to subscribe to lab progress'));
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
    setSelectedAssignment: (state, action: PayloadAction<Assignment | null>) => {
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
    addProgressEntry: (state, action: PayloadAction<LabProgress>) => {
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

    /** Replace the cohort roster (demo seeding; the API path uses fetchCohort). */
    setCohort: (state, action: PayloadAction<CohortStudent[]>) => {
      state.cohort = action.payload;
      state.status = 'succeeded';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCohort.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCohort.fulfilled, (state, action) => {
        state.cohort = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchCohort.rejected, (state, action) => {
        state.status = 'failed';
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to fetch cohort';
      })
      .addCase(fetchAssignments.fulfilled, (state, action) => {
        state.assignments = action.payload;
      })
      .addCase(bulkImport.fulfilled, (state, action) => {
        state.bulkImport = action.payload;
      })
      .addCase(subscribeLabProgressThunk.fulfilled, (state, action) => {
        state.progressStream = action.payload.slice(-100);
      });
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
  setCohort,
} = teamSlice.actions;

// Selectors
export const selectCohort = (state: RootState) => state.team.cohort;
export const selectProgressStream = (state: RootState) => state.team.progressStream;
export const selectTeamStatus = (state: RootState) => state.team.status;
export const selectTeamError = (state: RootState) => state.team.error;
export const selectSelectedAssignment = (state: RootState) => state.team.selectedAssignment;

export default teamSlice.reducer;
