import type { Middleware } from '@reduxjs/toolkit';
import { WSClient } from '../ws/client';
import {
  isWSAction,
  isWSMessageAction,
  wsSendFailed,
  WSActionType,
  type WSConnectPayload,
  type WSSendPayload,
} from '../ws/events';
import {
  ServerEventType,
  ScoringUpdatePayloadSchema,
  CommandOutputPayloadSchema,
  StateDeltaPayloadSchema,
} from '../ws/envelope';
import { appendTerminalOutput, applyStateDelta } from '../../features/desktop/slice';

// WebSocket middleware: intercepts Redux WS actions and manages the
// single WebSocket connection via WSClient. All WebSocket messages go
// through this middleware (single source of truth).
// Based on ARCHITECTURE.md section 4.5 WebSocket Event Schema.

/** Client created on the first ws/connect; null until then. */
let client: WSClient | null = null;

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

  if (isWSAction(action) && action.type === WSActionType.SEND) {
    const { type, payload } = action.payload as WSSendPayload;
    if (client) {
      try {
        client.send(type, payload);
      } catch (err) {
        // On a closed socket send() throws and has already dispatched
        // ws/send_failed itself; report anything else.
        if (client.isConnected()) {
          store.dispatch(
            wsSendFailed({ type, payload, error: err instanceof Error ? err.message : String(err) })
          );
        }
      }
    }
  }

  // Handle incoming ws/message — redistribute to appropriate listeners
  if (isWSMessageAction(action)) {
    const { envelope } = action.payload;
    if (envelope.t === ServerEventType.COMMAND_OUTPUT) {
      const parsed = CommandOutputPayloadSchema.safeParse(envelope.payload);
      if (parsed.success) {
        const { machineId, output } = parsed.data;
        store.dispatch(appendTerminalOutput({ machineId, output }));
      }
    }
    if (envelope.t === ServerEventType.STATE_DELTA) {
      const parsed = StateDeltaPayloadSchema.safeParse(envelope.payload);
      if (parsed.success) {
        const { subsystem, op, value } = parsed.data;
        store.dispatch(applyStateDelta({ subsystem, op, value }));
      }
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
