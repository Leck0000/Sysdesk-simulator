import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import ticketsReducer, { setQueue, selectFilteredQueue, selectQueueCounts } from './slice';
import authReducer from '../auth/slice';
import { DEMO_TICKETS } from '../../app/demo';

// The real store freezes state (immer); selectors must never mutate it.
const makeStore = () => configureStore({ reducer: { tickets: ticketsReducer, auth: authReducer } });
type State = Parameters<typeof selectFilteredQueue>[0];

describe('ticket selectors on frozen store state', () => {
  it('sorts critical first without mutating the frozen queue', () => {
    const store = makeStore();
    store.dispatch(setQueue([...DEMO_TICKETS].reverse()));
    const state = store.getState() as unknown as State;
    const before = state.tickets.queue.map((t) => t.id);

    const sorted = selectFilteredQueue(state);

    expect(sorted[0]?.priority).toBe('critical');
    expect(sorted.at(-1)?.priority).toBe('low');
    expect(state.tickets.queue.map((t) => t.id)).toEqual(before);
  });

  it('is memoized (same input -> same reference)', () => {
    const store = makeStore();
    store.dispatch(setQueue(DEMO_TICKETS));
    const state = store.getState() as unknown as State;
    expect(selectFilteredQueue(state)).toBe(selectFilteredQueue(state));
    expect(selectQueueCounts(state)).toBe(selectQueueCounts(state));
    expect(selectQueueCounts(state).open).toBe(3);
  });
});
