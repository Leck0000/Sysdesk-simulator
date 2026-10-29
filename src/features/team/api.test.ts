/** Team API endpoint tests */
/* Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * All WebSocket messages go through wsMiddleware (single source of truth).
 *
 * RTK Query does not expose endpoint definitions (providesTags/invalidatesTags)
 * on `api.endpoints.*` at runtime, so tag wiring is verified behaviourally:
 * a mutation must cause a subscribed 'Team' query to refetch.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { teamApi } from './api';
import type { Assignment } from './api';

const NativeRequest = globalThis.Request;

/** fetchBaseQuery builds `new Request('/team/...')`; Node rejects relative URLs. */
class RelativeRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(typeof input === 'string' ? new URL(input, 'http://localhost').href : input, init);
  }
}

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const makeStore = () =>
  configureStore({
    reducer: { [teamApi.reducerPath]: teamApi.reducer },
    middleware: (getDefault) => getDefault().concat(teamApi.middleware),
  });

const assignment: Assignment = {
  id: '3f1c2b4a-5d6e-4f70-8a9b-0c1d2e3f4a5b',
  title: 'Reset a password',
  description: 'Unlock and reset the AD account for a locked-out user',
  labId: '6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d',
  cohortId: '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d',
  status: 'open',
  createdAt: '2026-10-29T00:00:00.000Z',
};

let fetchMock: ReturnType<typeof vi.fn>;

const callsTo = (path: string) =>
  fetchMock.mock.calls.filter(([req]) => (req as Request).url.includes(path)).length;

const waitForCalls = async (path: string, count: number) => {
  await vi.waitFor(() => expect(callsTo(path)).toBe(count));
};

beforeEach(() => {
  vi.stubGlobal('Request', RelativeRequest);
  fetchMock = vi.fn((req: Request) =>
    // Bodies match the API contract: responses are Zod-validated by the endpoints.
    Promise.resolve(
      jsonResponse(
        req.method === 'GET'
          ? []
          : req.url.includes('/team/bulk-import')
            ? { success: true, imported: 1, failed: 0, errors: [] }
            : assignment
      )
    )
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Team API', () => {
  it('exposes all endpoints with initiate thunks', () => {
    for (const name of [
      'cohortQuery',
      'assignmentsQuery',
      'createAssignmentMutation',
      'bulkImportMutation',
      'subscribeLabProgress',
    ] as const) {
      expect(typeof teamApi.endpoints[name].initiate).toBe('function');
    }
  });

  it('createAssignmentMutation invalidates cohortQuery (Team tag)', async () => {
    const store = makeStore();
    const sub = store.dispatch(teamApi.endpoints.cohortQuery.initiate());
    await sub;
    expect(callsTo('/team/cohort')).toBe(1);

    await store.dispatch(teamApi.endpoints.createAssignmentMutation.initiate(assignment));

    await waitForCalls('/team/cohort', 2);
    sub.unsubscribe();
  });

  it('bulkImportMutation invalidates assignmentsQuery (Team tag)', async () => {
    const store = makeStore();
    const sub = store.dispatch(teamApi.endpoints.assignmentsQuery.initiate('cohort-1'));
    await sub;
    expect(callsTo('/team/assignments')).toBe(1);

    await store.dispatch(teamApi.endpoints.bulkImportMutation.initiate(new FormData()));

    await waitForCalls('/team/assignments', 2);
    sub.unsubscribe();
  });
});
