import type { Middleware } from '@reduxjs/toolkit';
import { WSClient } from '../ws/client';
import {
  isWSAction,
  isWSMessageAction,
  ClientEventType,
  WSActionType,
  type WSConnectPayload,
  type WSSendPayload,
} from '../ws/events';
import { ServerEventType, ScoringUpdatePayloadSchema } from '../ws/envelope';

// WebSocket middleware: intercepts Redux WS actions and manages the
// single WebSocket connection via WSClient. All WebSocket messages go
// through this middleware (single source of truth).
// Based on ARCHITECTURE.md section 4.5 WebSocket Event Schema.

/** Client created on the first ws/connect; null until then. */
let client: WSClient | null = null;

/**
 * WSClient.send() dispatches its own ws/send notification synchronously.
 * Without this guard that echo would re-enter the middleware and call
 * send() again, recursing until the stack overflows.
 */
let isSending = false;

export const wsMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  if (isWSAction(action) && action.type === WSActionType.CONNECT) {
    const { url, accessToken, protocols } = action.payload as WSConnectPayload;
    client = WSClient.getInstance({ url, accessToken, protocols });
    client.setStore(store.dispatch, store.getState);
    client.connect().catch(() => {
      // Connection failure — already dispatched by WSClient (ws/error)
    });
  }

  if (isWSAction(action) && action.type === WSActionType.DISCONNECT) {
    client?.disconnect();
  }

  if (isWSAction(action) && action.type === WSActionType.SEND && !isSending) {
    const { type, payload } = action.payload as WSSendPayload;
    if (client && type === ClientEventType.SEND_COMMAND) {
      isSending = true;
      try {
        client.send(type, payload).catch((err: unknown) => {
          store.dispatch({
            type: WSActionType.SEND_FAILED,
            payload: {
              type,
              payload,
              error: err instanceof Error ? err.message : String(err),
            },
          });
        });
      } catch {
        // send() throws synchronously when the socket is not open; the
        // client has already dispatched ws/send_failed in that case.
      } finally {
        isSending = false;
      }
    }
  }

  // Handle incoming ws/message — redistribute to appropriate listeners
  if (isWSMessageAction(action)) {
    const { envelope } = action.payload;
    if (envelope.t === ServerEventType.COMMAND_OUTPUT) {
      const { machineId, output } = envelope.payload as {
        machineId: string;
        output: string;
      };
      store.dispatch({
        type: 'terminal/command_output',
        payload: { machineId, output },
      });
    }
    if (envelope.t === ServerEventType.SCORING_UPDATE) {
      const scoringUpdate = ScoringUpdatePayloadSchema.safeParse(envelope.payload);
      if (scoringUpdate.success) {
        store.dispatch({
          type: 'scores/mergeScoringUpdate',
          payload: scoringUpdate.data,
        });
      }
    }
  }

  return result;
};
