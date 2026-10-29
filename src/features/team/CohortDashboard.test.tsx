/** CohortDashboard tests — demo roster, API roster, empty state and error state. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import teamReducer from './slice';
import { teamApi } from './api';
import { CohortDashboard } from './CohortDashboard';
import { DEMO_COHORT } from '../../app/demo';

const NativeRequest = globalThis.Request;
/** fetchBaseQuery builds `new Request('/team/...')`; Node rejects relative URLs. */
class RelativeRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(typeof input === 'string' ? new URL(input, 'http://localhost').href : input, init);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const makeStore = () =>
  configureStore({
    reducer: { team: teamReducer, [teamApi.reducerPath]: teamApi.reducer },
    middleware: (gdm) => gdm().concat(teamApi.middleware),
  });

function renderDashboard() {
  const store = makeStore();
  render(
    <Provider store={store}>
      <MemoryRouter>
        <CohortDashboard />
      </MemoryRouter>
    </Provider>
  );
  return store;
}

const student = {
  id: '2a6f0c4e-8b1d-4f3a-9c5e-7d2b1a0f3eaa',
  name: 'Api Student',
  role: 'technician',
  labId: '9d8c7b6a-5f4e-4d3c-8b2a-19f8e7d6c501',
  progress: 40,
  status: 'running',
  lastActive: new Date().toISOString(),
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubGlobal('Request', RelativeRequest);
  fetchMock = vi.fn(() => Promise.resolve(json([])));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('CohortDashboard', () => {
  it('in demo mode shows the demo cohort without calling the API', () => {
    window.history.replaceState(null, '', '/team?demo=1');
    renderDashboard();
    const cohort = screen.getByRole('region', { name: 'Cohort' });
    for (const s of DEMO_COHORT) {
      expect(within(cohort).getByText(s.name)).toBeInTheDocument();
    }
    expect(within(cohort).getAllByRole('progressbar')).toHaveLength(DEMO_COHORT.length);
    expect(screen.queryByText('No students in cohort')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches the roster from /team/cohort and renders each student', async () => {
    fetchMock.mockImplementation((req: Request) =>
      Promise.resolve(json(req.url.includes('/team/cohort') ? [student] : []))
    );
    renderDashboard();
    expect(await screen.findByText('Api Student')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progress 40%' })).toBeInTheDocument();
  });

  it('shows the empty state only after an empty roster has loaded', async () => {
    renderDashboard();
    expect(screen.queryByText('No students in cohort')).not.toBeInTheDocument();
    expect(await screen.findByText('No students in cohort')).toBeInTheDocument();
  });

  it('shows an error, not the empty state, when the roster fails to load', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({ message: 'boom' }, 500)));
    const store = renderDashboard();
    await vi.waitFor(() => expect(store.getState().team.status).toBe('failed'));
    expect(screen.getByText(store.getState().team.error ?? '')).toBeInTheDocument();
    expect(screen.queryByText('No students in cohort')).not.toBeInTheDocument();
  });
});
