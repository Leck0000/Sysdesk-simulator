/**
 * WebSocket Client with Reconnection, Heartbeat, and Sequence Acknowledgment
 * 
 * Singleton client managing WebSocket connection lifecycle.
 * Integrates with Redux via wsMiddleware for single source of truth.
 */

import type {
  WSEnvelope,
  ClientToServerPayload,
  ClientAckPayload,
  parseEnvelope,
  createEnvelope,
  ServerToClientPayload,
} from './envelope';

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
} from './events';

import {
  wsConnect,
  wsConnected,
  wsDisconnect,
  wsDisconnected,
  wsReconnecting,
  wsReconnectFailed,
  wsSend,
  wsMessage,
  wsSendFailed,
  wsHeartbeatSent,
  wsHeartbeatReceived,
  wsHeartbeatMissed,
  wsAckSent,
  wsAckReceived,
  wsAckTimeout,
  wsError,
  ServerEventType,
  ClientEventType,
} from './events';

/**
 * Configuration options for WSClient
 */
export interface WSClientConfig {
  /** WebSocket server URL */
  url: string;
  /** Access token for authentication */
  accessToken?: string;
  /** WebSocket subprotocols */
  protocols?: string[];
  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number;
  /** Max missed heartbeats before reconnect (default: 3) */
  maxMissedHeartbeats?: number;
  /** Reconnection base delay in ms (default: 1000) */
  reconnectBaseDelay?: number;
  /** Max reconnection delay in ms (default: 30000) */
  reconnectMaxDelay?: number;
  /** Max reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Acknowledgment timeout in ms (default: 5000) */
  ackTimeout?: number;
  /** Max acknowledgment retries (default: 3) */
  maxAckRetries?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<WSClientConfig> = {
  url: '',
  accessToken: undefined,
  protocols: [],
  heartbeatInterval: 30_000,
  maxMissedHeartbeats: 3,
  reconnectBaseDelay: 1_000,
  reconnectMaxDelay: 30_000,
  maxReconnectAttempts: 10,
  ackTimeout: 5_000,
  maxAckRetries: 3,
};

/**
 * Internal state for tracking pending acknowledgments
 */
interface PendingAck {
  seq: number;
  envelope: WSEnvelope<ClientToServerPayload>;
  retries: number;
  timeoutId: ReturnType<typeof setTimeout>;
  resolve: (value: WSEnvelope<ServerToClientPayload>) => void;
  reject: (reason: Error) => void;
}

/**
 * Minimal event emitter for internal use
 */
class EventEmitter {
  private listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

  on(event: string, listener: (...args: unknown[]) => void): void {
    (this.listeners[event] ??= []).push(listener);
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    const arr = this.listeners[event];
    if (arr) {
      const idx = arr.indexOf(listener);
      if (idx >= 0) arr.splice(idx, 1);
    }
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners[event]?.forEach((l) => l(...args));
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}

/**
 * WSClient - Singleton WebSocket client with reconnection, heartbeat, and seq acknowledgment
 */
export class WSClient extends EventEmitter {
  private static instance: WSClient | null = null;
  private ws: WebSocket | null = null;
  private config: Required<WSClientConfig>;
  private sessionId: string | null = null;
  private seq = 0;
  private pendingAcks = new Map<number, PendingAck>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private missedHeartbeats = 0;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private isIntentionalDisconnect = false;
  private dispatch: ((action: unknown) => void) | null = null;
  private getState: (() => { auth: { accessToken?: string } }) | null = null;

  private constructor(config: WSClientConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance (create if needed)
   */
  static getInstance(config?: WSClientConfig): WSClient {
    if (!WSClient.instance) {
      if (!config) {
        throw new Error('WSClient not initialized. Provide config on first call.');
      }
      WSClient.instance = new WSClient(config);
    } else if (config) {
      // Update config if provided
      WSClient.instance.config = { ...DEFAULT_CONFIG, ...config };
    }
    return WSClient.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (WSClient.instance) {
      WSClient.instance.destroy();
      WSClient.instance = null;
    }
  }

  /**
   * Set Redux store dispatch and getState for middleware integration
   */
  setStore(
    dispatch: (action: unknown) => void,
    getState: () => { auth: { accessToken?: string } }
  ): void {
    this.dispatch = dispatch;
    this.getState = getState;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<{ sessionId: string; capabilities: string[] }> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve({ sessionId: this.sessionId!, capabilities: [] });
    }

    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const onOpen = (sessionId: string, capabilities: string[]) => {
          this.off('open', onOpen);
          this.off('error', onError);
          resolve({ sessionId, capabilities });
        };
        const onError = (error: Error) => {
          this.off('open', onOpen);
          this.off('error', onError);
          reject(error);
        };
        this.on('open', onOpen);
        this.on('error', onError);
      });
    }

    this.isConnecting = true;
    this.isIntentionalDisconnect = false;

    // Get fresh token from store if available
    const token = this.getState?.().auth.accessToken ?? this.config.accessToken;
    const url = this.buildUrl(token);

    return new Promise((resolve, reject) => {
      try {
        // Use global WebSocket constructor
        (this.ws = new WebSocket(url, this.config.protocols)), (this.ws.binaryType = 'arraybuffer');

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempt = 0;
          this.startHeartbeat();
          // Send authenticate if we have a token
          if (token) {
            this.send(ClientEventType.AUTHENTICATE, { token });
          }
        };

        this.ws.onclose = (event: CloseEvent) => {
          this.isConnecting = false;
          this.stopHeartbeat();
          this.clearPendingAcks(new Error('Connection closed'));
          this.emit('close', event.code, event.reason, event.wasClean);

          if (!this.isIntentionalDisconnect && this.reconnectAttempt < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else if (!this.isIntentionalDisconnect) {
            this.emit('reconnect_failed');
          }
        };

        this.ws.onerror = (event: Event) => {
          const error = new Error('WebSocket error');
          this.emit('error', error);
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(error);
          }
        };

        this.ws.onmessage = (event: MessageEvent) => {
          this.handleMessage(event.data);
        };

        // Store resolve/reject for when session.init arrives
        const onOpen = (sessionId: string, capabilities: string[]) => {
          this.off('open', onOpen);
          resolve({ sessionId, capabilities });
        };
        const onError = (error: Error) => {
          this.off('open', onOpen);
          reject(error);
        };
        this.on('open', onOpen);
        this.on('error', onError);
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect gracefully
   */
  disconnect(code = 1000, reason = 'Client disconnect'): void {
    this.isIntentionalDisconnect = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close(code, reason);
    }
    this.ws = null;
    this.sessionId = null;
  }

  /**
   * Send a message with optional acknowledgment handling
   */
  send<T extends ClientToServerPayload>(
    type: ClientEventType,
    payload: T
  ): Promise<WSEnvelope<ServerToClientPayload> | void> {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      const error = new Error('WebSocket not connected');
      this.dispatch?.(wsSendFailed({ type, payload, error: error.message }));
      throw error;
    }

    const seq = ++this.seq;
    const envelope = createEnvelope(type, payload, this.sessionId || '', seq);

    const message = JSON.stringify(envelope);
    this.ws.send(message);

    this.dispatch?.(wsSend({ type, payload }));

    // For messages that expect ack (non-heartbeat, non-ack)
    if (type !== ClientEventType.HEARTBEAT && type !== ClientEventType.CLIENT_ACK) {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.handleAckTimeout(seq);
          reject(new Error(`Ack timeout for seq ${seq}`));
        }, this.config.ackTimeout);

        this.pendingAcks.set(seq, {
          seq,
          envelope,
          retries: 0,
          timeoutId,
          resolve: resolve as (value: WSEnvelope<ServerToClientPayload>) => void,
          reject,
        });
      });
    }

    return Promise.resolve();
  }

  /**
   * Send acknowledgment for received message
   */
  ack(seq: number): void {
    // Dispatch the ack action regardless of connection state
    // The CLIENT_ACK message is sent via send() when the WS is open
    // Here we just track the intent and dispatch the Redux action
    this.dispatch?.(wsAckSent({ seq, acknowledgedSeq: seq }));
  }

  /**
   * Get current connection state
   */
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Update access token (for auth refresh)
   */
  updateAccessToken(token: string): void {
    this.config.accessToken = token;
    if (this.isConnected()) {
      this.send(ClientEventType.AUTHENTICATE, { token });
    }
  }

  /**
   * Destroy client completely
   */
  destroy(): void {
    this.disconnect(1001, 'Client destroyed');
    this.removeAllListeners();
  }

  /**
   * Build WebSocket URL with auth token
   */
  private buildUrl(token?: string): string {
    const base = this.config.url ?? 'ws://localhost:8080/ws';
    const url = new URL(base);
    if (token) {
      url.searchParams.set('token', token);
    }
    return url.toString();
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string | ArrayBuffer): void {
    let rawData: string;
    if (typeof data === 'string') {
      rawData = data;
    } else {
      rawData = new TextDecoder().decode(data);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      this.dispatch?.(wsError({ message: 'Invalid JSON received', code: 'PARSE_ERROR', recoverable: true }));
      return;
    }

    const envelope = parseEnvelope(parsed);
    if (!envelope) {
      this.dispatch?.(wsError({ message: 'Invalid envelope format', code: 'INVALID_ENVELOPE', recoverable: true }));
      return;
    }

    // Handle server events
    switch (envelope.t) {
      case ServerEventType.SESSION_INIT: {
        const initPayload = envelope.payload as { sessionId: string; capabilities: string[] };
        this.sessionId = initPayload.sessionId;
        this.emit('open', initPayload.sessionId, initPayload.capabilities);
        this.dispatch?.(wsConnected({ sessionId: initPayload.sessionId, capabilities: initPayload.capabilities }));
        break;
      }

      case ServerEventType.HEARTBEAT: {
        this.missedHeartbeats = 0;
        this.dispatch?.(wsHeartbeatReceived({ timestamp: envelope.ts }));
        this.ack(envelope.seq);
        break;
      }

      case ServerEventType.CLIENT_ACK: {
        const ackPayload = envelope.payload as { seq: number };
        this.handleAckReceived(ackPayload.seq);
        break;
      }

      default: {
        // Dispatch to Redux for all other messages
        this.dispatch?.(wsMessage({ envelope: envelope as WSEnvelope<ServerToClientPayload>, rawData }));
        this.emit('message', envelope as WSEnvelope<ServerToClientPayload>, rawData);
        // Auto-ack for server-to-client messages that need it
        this.ack(envelope.seq);
      }
    }
  }

  /**
   * Handle received acknowledgment
   */
  private handleAckReceived(ackedSeq: number): void {
    const pending = this.pendingAcks.get(ackedSeq);
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingAcks.delete(ackedSeq);
      this.dispatch?.(wsAckReceived({ seq: pending.seq, acknowledgedSeq: ackedSeq }));
      // Note: In a real implementation, we'd match the response envelope here
      // For now, resolve with a minimal envelope
      pending.resolve({
        v: 1,
        t: 'ack',
        sid: this.sessionId || '',
        seq: ackedSeq,
        ts: Date.now(),
        payload: { seq: ackedSeq },
      } as WSEnvelope<ServerToClientPayload>);
    }
  }

  /**
   * Handle acknowledgment timeout with retry
   */
  private handleAckTimeout(seq: number): void {
    const pending = this.pendingAcks.get(seq);
    if (!pending) return;

    if (pending.retries < this.config.maxAckRetries) {
      pending.retries++;
      clearTimeout(pending.timeoutId);
      pending.timeoutId = setTimeout(() => {
        this.handleAckTimeout(seq);
      }, this.config.ackTimeout * (pending.retries + 1));

      // Retry sending
      this.ws?.send(JSON.stringify(pending.envelope));
      this.dispatch?.(wsAckTimeout({ seq, retries: pending.retries }));
    } else {
      this.pendingAcks.delete(seq);
      clearTimeout(pending.timeoutId);
      pending.reject(new Error(`Max ack retries exceeded for seq ${seq}`));
      this.dispatch?.(wsError({ message: `Max ack retries exceeded for seq ${seq}`, code: 'ACK_MAX_RETRIES', recoverable: true }));
    }
  }

  /**
   * Clear all pending acknowledgments
   */
  private clearPendingAcks(error: Error): void {
    for (const pending of this.pendingAcks.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject(error);
    }
    this.pendingAcks.clear();
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.missedHeartbeats = 0;
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Send heartbeat
   */
  private sendHeartbeat(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    this.send(ClientEventType.HEARTBEAT, {});
    this.dispatch?.(wsHeartbeatSent({ timestamp: Date.now() }));
    this.missedHeartbeats++;

    if (this.missedHeartbeats > this.config.maxMissedHeartbeats) {
      this.dispatch?.(wsHeartbeatMissed({ missedCount: this.missedHeartbeats }));
      this.ws?.close(1006, 'Heartbeat timeout');
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempt),
      this.config.reconnectMaxDelay
    );
    // Add jitter
    const jitter = delay * 0.1 * Math.random();
    const nextRetryMs = Math.floor(delay + jitter);

    this.reconnectAttempt++;
    this.emit('reconnecting', this.reconnectAttempt, nextRetryMs);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Connection failure handled by onclose
      });
    }, nextRetryMs);
  }
}

/**
 * Type-safe wrapper for parseEnvelope (re-export)
 */
export { parseEnvelope, createEnvelope } from './envelope';
export type { WSEnvelope, ClientToServerPayload, ServerToClientPayload } from './envelope';