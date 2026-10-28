/**
 * Typed WebSocket Event Creators
 * 
 * Provides type-safe action creators for WebSocket events
 * that integrate with Redux via wsMiddleware.
 */

import type {
  WSEnvelope,
  ClientEventType,
  ClientToServerPayload,
  ClientAckPayload,
  AuthenticatePayload,
  RequestMachineStatePayload,
  SendCommandPayload,
  AddTicketMessagePayload,
  ClaimTicketPayload,
} from './envelope';

/**
 * Redux action types for WebSocket lifecycle
 */
export const WSActionType = {
  // Connection lifecycle
  CONNECT: 'ws/connect',
  CONNECTED: 'ws/connected',
  DISCONNECT: 'ws/disconnect',
  DISCONNECTED: 'ws/disconnected',
  RECONNECTING: 'ws/reconnecting',
  RECONNECT_FAILED: 'ws/reconnect_failed',
  
  // Message handling
  SEND: 'ws/send',
  MESSAGE: 'ws/message',
  SEND_FAILED: 'ws/send_failed',
  
  // Heartbeat
  HEARTBEAT_SENT: 'ws/heartbeat_sent',
  HEARTBEAT_RECEIVED: 'ws/heartbeat_received',
  HEARTBEAT_MISSED: 'ws/heartbeat_missed',
  
  // Sequence acknowledgment
  ACK_SENT: 'ws/ack_sent',
  ACK_RECEIVED: 'ws/ack_received',
  ACK_TIMEOUT: 'ws/ack_timeout',
  
  // Errors
  ERROR: 'ws/error',
} as const;

export type WSActionType = (typeof WSActionType)[keyof typeof WSActionType];

/**
 * Payload types for WS actions
 */
export interface WSConnectPayload {
  url: string;
  accessToken?: string;
  protocols?: string[];
}

export interface WSConnectedPayload {
  sessionId: string;
  capabilities: string[];
}

export interface WSDisconnectPayload {
  code?: number;
  reason?: string;
  wasClean: boolean;
}

export interface WSReconnectingPayload {
  attempt: number;
  maxAttempts: number;
  nextRetryMs: number;
}

export interface WSSendPayload {
  type: ClientEventType;
  payload: ClientToServerPayload;
}

export interface WSMessagePayload<T = unknown> {
  envelope: WSEnvelope<T>;
  rawData: string;
}

export interface WSSendFailedPayload {
  type: ClientEventType;
  payload: ClientToServerPayload;
  error: string;
}

export interface WSHeartbeatPayload {
  timestamp: number;
}

export interface WSAckPayload {
  seq: number;
  acknowledgedSeq: number;
}

export interface WSAckTimeoutPayload {
  seq: number;
  retries: number;
}

export interface WSErrorPayload {
  message: string;
  code?: string;
  recoverable: boolean;
}

/**
 * Typed action creators
 */

// Connection lifecycle
export function wsConnect(payload: WSConnectPayload) {
  return { type: WSActionType.CONNECT, payload } as const;
}

export function wsConnected(payload: WSConnectedPayload) {
  return { type: WSActionType.CONNECTED, payload } as const;
}

export function wsDisconnect(payload?: WSDisconnectPayload) {
  return { type: WSActionType.DISCONNECT, payload } as const;
}

export function wsDisconnected(payload: WSDisconnectPayload) {
  return { type: WSActionType.DISCONNECTED, payload } as const;
}

export function wsReconnecting(payload: WSReconnectingPayload) {
  return { type: WSActionType.RECONNECTING, payload } as const;
}

export function wsReconnectFailed(payload: { maxAttempts: number }) {
  return { type: WSActionType.RECONNECT_FAILED, payload } as const;
}

// Message handling
export function wsSend(payload: WSSendPayload) {
  return { type: WSActionType.SEND, payload } as const;
}

export function wsMessage<T>(payload: WSMessagePayload<T>) {
  return { type: WSActionType.MESSAGE, payload } as const;
}

export function wsSendFailed(payload: WSSendFailedPayload) {
  return { type: WSActionType.SEND_FAILED, payload } as const;
}

// Heartbeat
export function wsHeartbeatSent(payload: WSHeartbeatPayload) {
  return { type: WSActionType.HEARTBEAT_SENT, payload } as const;
}

export function wsHeartbeatReceived(payload: WSHeartbeatPayload) {
  return { type: WSActionType.HEARTBEAT_RECEIVED, payload } as const;
}

export function wsHeartbeatMissed(payload: { missedCount: number }) {
  return { type: WSActionType.HEARTBEAT_MISSED, payload } as const;
}

// Sequence acknowledgment
export function wsAckSent(payload: WSAckPayload) {
  return { type: WSActionType.ACK_SENT, payload } as const;
}

export function wsAckReceived(payload: WSAckPayload) {
  return { type: WSActionType.ACK_RECEIVED, payload } as const;
}

export function wsAckTimeout(payload: WSAckTimeoutPayload) {
  return { type: WSActionType.ACK_TIMEOUT, payload } as const;
}

// Errors
export function wsError(payload: WSErrorPayload) {
  return { type: WSActionType.ERROR, payload } as const;
}

/**
 /** Convenience creators for client-to-server messages
  * These create the proper payload structure for wsSend
  */

 export function createClientAck(seq: number): ClientAckPayload {
   return { seq };
 }

 /** Export event types for client.ts and middleware */
 export { ServerEventType, ClientEventType } from './envelope';

export function createAuthenticate(token: string): AuthenticatePayload {
  return { token };
}

export function createRequestMachineState(machineId: string): RequestMachineStatePayload {
  return { machineId };
}

export function createSendCommand(machineId: string, command: string): SendCommandPayload {
  return { machineId, command };
}

export function createAddTicketMessage(ticketId: string, message: string): AddTicketMessagePayload {
  return { ticketId, message };
}

export function createClaimTicket(ticketId: string): ClaimTicketPayload {
  return { ticketId };
}

/**
 * Type guard to check if an action is a WS action
 */
export function isWSAction(action: unknown): action is { type: WSActionType; payload: unknown } {
  return (
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    typeof (action as { type: unknown }).type === 'string' &&
    Object.values(WSActionType).includes((action as { type: string }).type as WSActionType)
  );
}

/**
 * Type guard for message actions with typed envelope
 */
export function isWSMessageAction<T>(
  action: unknown,
  eventType?: string
): action is { type: 'ws/message'; payload: { envelope: WSEnvelope<T>; rawData: string } } {
  if (!isWSAction(action) || action.type !== WSActionType.MESSAGE) {
    return false;
  }
  if (eventType && 'envelope' in action.payload) {
    return (action.payload as { envelope: WSEnvelope }).envelope.t === eventType;
  }
  return true;
}