import { Middleware } from '@reduxjs/toolkit';
import { isWSAction, createSendCommand, ClientEventType, isClientEventType } from '../shared/ws/events';
import { ServerEventType, ScoringUpdateSchema } from '../shared/ws/envelope';

// WebSocket middleware: intercepts Redux WS actions and manages the
// single WebSocket connection via WSClient. All WebSocket messages go
// through this middleware (single source of truth).
// Based on ARCHITECTURE.md section 4.5 WebSocket Event Schema.
export const wsMiddleware: Middleware = (store) => (next) => (action) => {
  'use strict';
  const result = next(action);

  // Handle WS connect action
  if (isWSAction(action) && action.type === 'ws/connect') {
    const { payload } = action;
    // @ts-expect-error - WSClient available globally at runtime
    const { connect } = (window as any).WSClient;
    if (connect) {
      connect(payload.url, payload.accessToken).catch(() => {
        // Connection failure — already emitted via WSClient events
      });
    }
  }

  // Handle WS disconnect action
  if (isWSAction(action) && action.type === 'ws/disconnect') {
    // @ts-expect-error - WSClient available globally at runtime
    const { disconnect } = (window as any).WSClient;
    if (disconnect) {
      disconnect();
    }
  }

  // Handle ws/send action — dispatch through WSClient
  if (isWSAction(action) && action.type === 'ws/send') {
    const { payload } = action;
    // @ts-expect-error - WSClient.send available globally at runtime
    const { send } = (window as any).WSClient;
    if (send && payload.type === ClientEventType.SEND_COMMAND) {
      send(payload.type, payload.payload).catch((err) => {
        store.dispatch({
          type: 'ws/send_failed',
          payload: {
            type: payload.type,
            payload: payload.payload,
            error: err.message,
          },
        } as const);
      });
    }
  }

  // Handle incoming ws/message — redistribute to appropriate listeners
  if (isWSMessageAction(action)) {
    const { envelope } = action.payload;
    if (envelope.t === ClientEventType.COMMAND_OUTPUT) {
      const { machineId, output } = envelope.payload as {
        machineId: string;
        output: string;
      };
      store.dispatch({
        type: 'terminal/command_output',
        payload: { machineId, output },
      } as const);
    }
    if (envelope.t === ServerEventType.SCORING_UPDATE) {
      const { payload } = envelope;
      const scoringUpdate = ScoringUpdateSchema.safeParse(payload);
      if (scoringUpdate.success) {
        store.dispatch({
          type: 'scores/mergeScoringUpdate',
          payload: scoringUpdate.data,
        } as const);
      }
    }
  }

  return result;
};
