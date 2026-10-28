/**
 * WebSocket Redux Middleware
 * 
 * Single source of truth for WebSocket message handling.
 * All WebSocket messages go through this middleware.
 * 
 * Based on ARCHITECTURE.md section 4.5 WebSocket Event Schema
 * and section 5.6 WebSocket Event Types.
 */

import type { Middleware } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../app/store';
import type {
  WSActionType,
  WSConnectPayload,
  WSConnectedPayload,
  WSDisconnectPayload,
  WSReconnectingPayload,
  WSSendPayload,
  WSMessagePayload,
  WSSendFailedPayload,
  WSHeartbeatPayload,
  WSAckPayload,
  WSAckTimeoutPayload,
  WSErrorPayload,
  WSEnvelope,
  ClientEventType,
  ServerEventType,
  parseEnvelope,
  createEnvelope,
} from '../shared/ws';
import type { WSClient } from '../shared/ws/client';

/**
 * WebSocket middleware action types
 */
export const wsMiddlewarePaths = {
  connect: 'ws/connect',
  connected: 'ws/connected',
  disconnect: 'ws/disconnect',
  disconnected: 'ws/disconnected',
  reconnecting: 'ws/reconnecting',
  reconnectFailed: 'ws/reconnect_failed',
  send: 'ws/send',
  message: 'ws/message',
  sendFailed: 'ws/send_failed',
  heartbeatSent: 'ws/heartbeat_sent',
  heartbeatReceived: 'ws/heartbeat_received',
  heartbeatMissed: 'ws/heartbeat_missed',
  ackSent: 'ws/ack_sent',
  ackReceived: 'ws/ack_received',
  ackTimeout: 'ws/ack_timeout',
  error: 'ws/error',
} as const;

export type WSMiddlewarePath = (typeof wsMiddlewarePaths)[keyof typeof wsMiddlewarePaths];

/**
 * WebSocket state stored in Redux
 */
export interface WSState {
  /** Whether a WebSocket connection is established */
  connected: boolean;
  /** The session ID from the initial session.init message */
  sessionId: string | null;
  /** Client capabilities from session.init */
  capabilities: string[];
  /** Current WebSocket readyState */
  readyState: number;
  /** Last error encountered */
  lastError: string | null;
  /** Missed heartbeat count */
  missedHeartbeats: number;
  /** Reconnection attempt count */
  reconnectAttempt: number;
  /** Whether a reconnect is in progress */
  isReconnecting: boolean;
  /** Pending acknowledgment sequences */
  pendingAcks: number[];
}

/**
 * Initial WS state
 */
export const initialWSState: WSState = {
  connected: false,
  sessionId: null,
  capabilities: [],
  readyState: WebSocket.CLOSED,
  lastError: null,
  missedHeartbeats: 0,
  reconnectAttempt: 0,
  isReconnecting: false,
  pendingAcks: [],
};

/**
 * WebSocket middleware
 * Manages WebSocket connection lifecycle, message handling, reconnection, and heartbeat
 */
export const wsMiddleware: Middleware = (store) => (next) => (action) => {
  // Handle WebSocket connect action
  if (action.type === wsMiddlewarePaths.connect) {
    const { url, accessToken, protocols } = action.payload;

    // Get the WS client instance or create one
    // The client is expected to be available via the store or passed in
    const client = store.getState().ws?.client;

    if (!client) {
      // Dispatch error if no client instance
      next({
        type: wsMiddlewarePaths.error,
        payload: {
          message: 'No WS client instance configured',
          code: 'NO_CLIENT',
          recoverable: true,
        },
      });
      return next(action);
    }

    // Set up store reference on the client if not already set
    if (!client.getStore) {
      // @ts-expect-error - we're setting up the store binding
      client.setStore(store.dispatch, () => store.getState());
    }

    // Initiate connection
    client.connect()
      .then(({ sessionId, capabilities }) => {
        // Connection succeeded
        // The client's onopen handler will dispatch wsConnected
      })
      .catch((error) => {
        next({
          type: wsMiddlewarePaths.error,
          payload: {
            message: error.message,
            code: 'CONNECT_ERROR',
            recoverable: true,
          },
        });
      });

    return next(action);
  }

  // Handle WebSocket disconnect action
  if (action.type === wsMiddlewarePaths.disconnect) {
    const client = store.getState().ws?.client;

    if (client) {
      client.disconnect();
    }

    return next(action);
  }

  // Forward all other actions to the WS client for processing
  // The WS client's send method handles message transmission
  if (action.type === wsMiddlewarePaths.send) {
    const { type: msgType, payload } = action.payload;

    const client = store.getState().ws?.client;

    if (!client) {
      next({
        type: wsMiddlewarePaths.sendFailed,
        payload: {
          type: msgType,
          payload,
          error: 'No WS client instance configured',
        },
      });
      return next(action);
    }

    // Send the message and handle the promise
    client.send(msgType, payload)
      .then((response) => {
        // Message sent successfully, response handled by client internals
      })
      .catch((error) => {
        next({
          type: wsMiddlewarePaths.sendFailed,
          payload: {
            type: msgType,
            payload,
            error: error.message,
          },
        });
      });

    return next(action);
  }

  // Handle message actions that come from the WS client
  // These are dispatched by the client when messages are received
  if (action.type === wsMiddlewarePaths.message) {
    const { envelope, rawData } = action.payload;

    // Dispatch based on event type
    const eventType = envelope.t;

    // Forward the message to reducers based on event type
    // This could dispatch specific action types like 'ws/cmd.result', etc.
    // For now, dispatch a generic ws/message action
    next({
      type: wsMiddlewarePaths.message,
      payload: { envelope, rawData },
    });

    return next(action);
  }

  // Handle heartbeat received
  if (action.type === wsMiddlewarePaths.heartbeatReceived) {
    next({
      type: wsMiddlewarePaths.heartbeatReceived,
      payload: action.payload,
    });
    return next(action);
  }

  // Handle acknowledgment sent
  if (action.type === wsMiddlewarePaths.ackSent) {
    next({
      type: wsMiddlewarePaths.ackSent,
      payload: action.payload,
    });
    return next(action);
  }

  // Handle acknowledgment timeout
  if (action.type === wsMiddlewarePaths.ackTimeout) {
    next({
      type: wsMiddlewarePaths.ackTimeout,
      payload: action.payload,
    });
    return next(action);
  }

  // Handle reconnecting
  if (action.type === wsMiddlewarePaths.reconnecting) {
    next({
      type: wsMiddlewarePaths.reconnecting,
      payload: action.payload,
    });
    return next(action);
  }

  // Handle reconnect failed
  if (action.type === wsMiddlewarePaths.reconnectFailed) {
    next({
      type: wsMiddlewarePaths.reconnectFailed,
      payload: action.payload,
    });
    return next(action);
  }

  // Handle WebSocket error from client
  if (action.type === wsMiddlewarePaths.error) {
    next({
      type: wsMiddlewarePaths.error,
      payload: action.payload,
    });
    return next(action);
  }

  return next(action);
};

/**
 * Initialize WebSocket middleware with a client instance
 * This should be called once during store setup
 */
export function initWSMiddleware(client: WSClient): void {
  // Set up the store bindings on the client
  // The client's setStore method will be called by the middleware flow
}

/**
 * Get the current WS state from the store
 */
export function useWSState(): WSState {
  return store.getState().ws?.state ?? initialWSState;
}

/**
 * Get the WS dispatch function
 */
export function useWSDispatch(): typeof wsMiddleware {
  // This is a simplified hook - in practice, use react-redux's useDispatch
  return wsMiddleware;
}