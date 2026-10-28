/**
 * WebSocket module barrel — re-exports all WS utilities for convenient importing.
 * All WebSocket messages go through wsMiddleware (single source of truth).
 * Based on ARCHITECTURE.md section 4.5 WebSocket Event Schema.
 */
export { wsSend, createSendCommand, ClientEventType, isClientEventType } from './events';
export { wsConnect, wsConnected, wsDisconnect, wsDisconnected } from './events';
export { wsSendFailed, wsMessage, wsHeartbeatSent, wsHeartbeatReceived } from './events';
export { wsAckSent, wsAckReceived, wsAckTimeout, wsError } from './events';
export { isWSAction, isWSMessageAction } from './events';
export { parseEnvelope, createEnvelope } from './envelope';
export type { WSEnvelope, ClientToServerPayload, ServerToClientPayload } from './envelope';
export type { WSActionType, ClientEventType, ServerEventType } from './events';
export type { WSClient } from './client';
export type { WSState } from './ws/middleware';
export { wsMiddleware } from './ws/middleware';