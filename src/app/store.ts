import { configureStore, Middleware } from '@reduxjs/toolkit';
import { wsMiddleware } from '../shared/middleware/wsMiddleware';
import { ticketsApi } from '../features/tickets/api';

// Placeholder slice reducers matching ARCHITECTURE.md data models
const createEmptySlice = (name: string) => ({
  name,
  reducer: (state = {} as const) => state,
});

const authSlice = createEmptySlice('auth');
const ticketsSlice = createEmptySlice('tickets');
const desktopSlice = createEmptySlice('desktop');
const communicationSlice = createEmptySlice('communication');
const scoringSlice = createEmptySlice('scoring');
const teamSlice = createEmptySlice('team');
const certificatesSlice = createEmptySlice('certificates');
const layoutSlice = createEmptySlice('layout');

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    tickets: ticketsSlice.reducer,
    desktop: desktopSlice.reducer,
    communication: communicationSlice.reducer,
    scoring: scoringSlice.reducer,
    team: teamSlice.reducer,
    certificates: certificatesSlice.reducer,
    layout: layoutSlice.reducer,
    [ticketsApi.reducerPath]: ticketsApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(ticketsApi.middleware, wsMiddleware),
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
