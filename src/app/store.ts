import { configureStore } from '@reduxjs/toolkit';
import { wsMiddleware } from '../shared/middleware/wsMiddleware';
import wsReducer from '../shared/ws/slice';
import authReducer from '../features/auth/slice';
import ticketsReducer from '../features/tickets/slice';
import desktopReducer from '../features/desktop/slice';
import communicationReducer from '../features/communication/slice';
import scoresReducer from '../features/scoring/slice';
import teamReducer from '../features/team/slice';
import certificatesReducer from '../features/certificates/slice';
import { authApi } from '../features/auth/api';
import { ticketsApi } from '../features/tickets/api';
import { scoringApi } from '../features/scoring/api';
import { teamApi } from '../features/team/api';
import { certificatesApi } from '../features/certificates/api';

export const store = configureStore({
  reducer: {
    ws: wsReducer,
    auth: authReducer,
    tickets: ticketsReducer,
    desktop: desktopReducer,
    communication: communicationReducer,
    scores: scoresReducer,
    team: teamReducer,
    certificates: certificatesReducer,
    [authApi.reducerPath]: authApi.reducer,
    [ticketsApi.reducerPath]: ticketsApi.reducer,
    [scoringApi.reducerPath]: scoringApi.reducer,
    [teamApi.reducerPath]: teamApi.reducer,
    [certificatesApi.reducerPath]: certificatesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      ticketsApi.middleware,
      scoringApi.middleware,
      teamApi.middleware,
      certificatesApi.middleware,
      wsMiddleware
    ),
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
