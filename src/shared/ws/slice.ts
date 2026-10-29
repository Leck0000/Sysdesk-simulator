/**
 * ws slice — connection state for the single WebSocket connection.
 * Reduces the lifecycle notifications WSClient dispatches via wsMiddleware;
 * components read e.g. `state.ws.sessionId` instead of touching the client.
 */
import { createAction, createSlice } from '@reduxjs/toolkit';
import {
  WSActionType,
  type WSConnectedPayload,
  type WSErrorPayload,
  type WSReconnectingPayload,
} from './events';

export interface WSState {
  connected: boolean;
  sessionId: string | null;
  capabilities: string[];
  lastError: string | null;
  missedHeartbeats: number;
  reconnectAttempt: number;
  isReconnecting: boolean;
}

export const initialWSState: WSState = {
  connected: false,
  sessionId: null,
  capabilities: [],
  lastError: null,
  missedHeartbeats: 0,
  reconnectAttempt: 0,
  isReconnecting: false,
};

// Typed matchers for the plain action objects WSClient dispatches.
const connected = createAction<WSConnectedPayload>(WSActionType.CONNECTED);
const disconnected = createAction(WSActionType.DISCONNECTED);
const reconnecting = createAction<WSReconnectingPayload>(WSActionType.RECONNECTING);
const reconnectFailed = createAction(WSActionType.RECONNECT_FAILED);
const heartbeatReceived = createAction(WSActionType.HEARTBEAT_RECEIVED);
const heartbeatMissed = createAction<{ missedCount: number }>(WSActionType.HEARTBEAT_MISSED);
const wsErrored = createAction<WSErrorPayload>(WSActionType.ERROR);

export const wsSlice = createSlice({
  name: 'ws',
  initialState: initialWSState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(connected, (state, action) => {
        state.connected = true;
        state.sessionId = action.payload.sessionId;
        state.capabilities = action.payload.capabilities;
        state.lastError = null;
        state.missedHeartbeats = 0;
        state.reconnectAttempt = 0;
        state.isReconnecting = false;
      })
      .addCase(disconnected, (state) => {
        state.connected = false;
        state.sessionId = null;
      })
      .addCase(reconnecting, (state, action) => {
        state.isReconnecting = true;
        state.reconnectAttempt = action.payload.attempt;
      })
      .addCase(reconnectFailed, (state) => {
        state.isReconnecting = false;
        state.connected = false;
      })
      .addCase(heartbeatReceived, (state) => {
        state.missedHeartbeats = 0;
      })
      .addCase(heartbeatMissed, (state, action) => {
        state.missedHeartbeats = action.payload.missedCount;
      })
      .addCase(wsErrored, (state, action) => {
        state.lastError = action.payload.message;
      });
  },
});

export default wsSlice.reducer;
