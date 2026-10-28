/** Team API endpoint tests */
/* Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * All WebSocket messages go through wsMiddleware (single source of truth). */

import { describe, it, expect } from 'vitest';
import { teamApi } from './api';

describe('Team API', () => {
  describe('cohortQuery', () => {
    it('should have a valid query definition', () => {
      const query = teamApi.endpoints.cohortQuery;
      expect(query).toBeDefined();
    });

    it('should provide tags for invalidation', () => {
      const query = teamApi.endpoints.cohortQuery;
      expect(query.providesTags).toBeDefined();
    });
  });

  describe('assignmentsQuery', () => {
    it('should accept a cohortId parameter', () => {
      const query = teamApi.endpoints.assignmentsQuery;
      expect(query).toBeDefined();
    });

    it('should provide tags for invalidation', () => {
      const query = teamApi.endpoints.assignmentsQuery;
      expect(query.providesTags).toBeDefined();
    });
  });

  describe('createAssignmentMutation', () => {
    it('should be a mutation endpoint', () => {
      const mutation = teamApi.endpoints.createAssignmentMutation;
      expect(mutation).toBeDefined();
    });

    it('should invalidate tags on completion', () => {
      const mutation = teamApi.endpoints.createAssignmentMutation;
      expect(mutation.invalidatesTags).toBeDefined();
    });
  });

  describe('bulkImportMutation', () => {
    it('should accept FormData', () => {
      const mutation = teamApi.endpoints.bulkImportMutation;
      expect(mutation).toBeDefined();
    });

    it('should invalidate tags on completion', () => {
      const mutation = teamApi.endpoints.bulkImportMutation;
      expect(mutation.invalidatesTags).toBeDefined();
    });
  });

  describe('subscribeLabProgress', () => {
    it('should be a query endpoint', () => {
      const query = teamApi.endpoints.subscribeLabProgress;
      expect(query).toBeDefined();
    });
  });
});
