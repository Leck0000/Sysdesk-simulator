/**
 * WSClient tests. Protocol (ARCHITECTURE.md §5.6): the client acks every server
 * `seq` with `client.ack`; `heartbeat` flows both ways; the server never acks
 * client frames (it retransmits on gaps), so the client must not retransmit.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { UnknownAction } from '@reduxjs/toolkit';
import { WSClient } from './client';
import { parseEnvelope, createEnvelope } from './envelope';
import { ServerEventType, ClientEventType, WSActionType } from './events';
import type { WSClientConfig } from './client';
import { FakeSocket } from '../../test/fakeWebSocket';

const SESSION_ID = '1b84c7d2-9b0e-4527-bd82-ef0c2f5b6a1d';

describe('WSClient', () => {
  let client: WSClient;
  let actions: UnknownAction[];
  const config: WSClientConfig = {
    url: 'ws://localhost:8080/ws',
    accessToken: 'test-token-123',
    heartbeatInterval: 1_000,
    maxMissedHeartbeats: 2,
  };

  /** Connect over a FakeSocket and complete the session.init handshake. */
  function connect(): FakeSocket {
    void client.connect();
    const socket = FakeSocket.last;
    if (!socket) throw new Error('no socket');
    socket.onopen?.();
    socket.receive(ServerEventType.SESSION_INIT, { sessionId: SESSION_ID, userPrincipal: 'tech1', caps: ['terminal'] }, 1);
    socket.send.mockClear();
    actions.length = 0;
    return socket;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', FakeSocket);
    FakeSocket.last = null;
    WSClient.resetInstance();
    client = WSClient.getInstance(config);
    actions = [];
    client.setStore((a) => actions.push(a), () => ({ auth: {} }));
  });

  afterEach(() => {
    WSClient.resetInstance();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('envelopes and event types', () => {
    it('parses a valid envelope', () => {
      const parsed = parseEnvelope(createEnvelope(ClientEventType.CLIENT_ACK, { seq: 1 }, SESSION_ID, 1));
      expect(parsed?.t).toBe('client.ack');
      expect(parsed?.seq).toBe(1);
    });

    it('returns null for a non-envelope object', () => {
      expect(parseEnvelope({})).toBeNull();
    });

    it('returns null when required fields are missing', () => {
      expect(parseEnvelope({ v: 0 })).toBeNull();
    });

    it('defines the server event names', () => {
      expect(ServerEventType.SESSION_INIT).toBe('session.init');
      expect(ServerEventType.HEARTBEAT).toBe('heartbeat');
      expect(ServerEventType.CMD_RESULT).toBe('cmd.result');
    });

    it('defines the client event names, with heartbeat in both directions', () => {
      expect(ClientEventType.CLIENT_ACK).toBe('client.ack');
      expect(ClientEventType.AUTHENTICATE).toBe('authenticate');
      expect(ClientEventType.SEND_COMMAND).toBe('send_command');
      expect(ClientEventType.HEARTBEAT).toBe('heartbeat');
    });
  });

  describe('singleton', () => {
    it('returns the same instance on repeated calls', () => {
      expect(WSClient.getInstance()).toBe(client);
    });

    it('requires config again after reset', () => {
      WSClient.resetInstance();
      expect(() => WSClient.getInstance()).toThrow('WSClient not initialized');
    });
  });

  describe('connection', () => {
    it('starts CLOSED and rejects connect cleanly when the socket errors', async () => {
      expect(client.readyState).toBe(WebSocket.CLOSED);
      const p = client.connect();
      FakeSocket.last?.onerror?.(new Event('error'));
      await expect(p).rejects.toThrow('WebSocket error');
    });

    it('authenticates on open and resolves with session.init (caps)', async () => {
      const p = client.connect();
      const socket = FakeSocket.last;
      socket?.onopen?.();
      expect(socket?.frames()[0]).toMatchObject({ t: 'authenticate', payload: { token: 'test-token-123' } });
      socket?.receive(ServerEventType.SESSION_INIT, { sessionId: SESSION_ID, userPrincipal: 'tech1', caps: ['terminal', 'ad'] }, 1);
      await expect(p).resolves.toEqual({ sessionId: SESSION_ID, capabilities: ['terminal', 'ad'] });
      expect(actions).toContainEqual({ type: WSActionType.CONNECTED, payload: { sessionId: SESSION_ID, capabilities: ['terminal', 'ad'] } });
      expect(client.getSessionId()).toBe(SESSION_ID);
    });

    it('reports an invalid session.init instead of connecting', () => {
      void client.connect().catch(() => {});
      FakeSocket.last?.onopen?.();
      FakeSocket.last?.receive(ServerEventType.SESSION_INIT, { sessionId: 'not-a-uuid' }, 1);
      expect(actions.some((a) => a.type === WSActionType.CONNECTED)).toBe(false);
      expect(actions.some((a) => a.type === WSActionType.ERROR)).toBe(true);
    });
  });

  describe('sending', () => {
    it('throws when not connected and does not consume a seq', () => {
      expect(() => client.send(ClientEventType.HEARTBEAT, {})).toThrow('WebSocket not connected');
      const socket = connect();
      client.send(ClientEventType.SEND_COMMAND, { machineId: SESSION_ID, command: 'ipconfig' });
      // seq 1 was authenticate, then the ack for session.init; a failed send consumed nothing
      expect(socket.frames()[0]?.seq).toBe(3);
    });

    it('writes each frame exactly once — no client-side retransmission', () => {
      const socket = connect();
      client.send(ClientEventType.SEND_COMMAND, { machineId: SESSION_ID, command: 'ipconfig' });
      vi.advanceTimersByTime(60_000);
      const commands = socket.frames().filter((f) => f.t === 'send_command');
      expect(commands).toHaveLength(1);
      expect(actions.some((a) => a.type === WSActionType.ERROR)).toBe(false);
    });
  });

  describe('acknowledgment', () => {
    it('acks each server message with client.ack { seq }', () => {
      const socket = connect();
      socket.receive(ServerEventType.CMD_RESULT, { cmdId: 'c1', exitCode: 0, stdout: '', stderr: '' }, 7);
      expect(socket.frames()).toContainEqual(expect.objectContaining({ t: 'client.ack', payload: { seq: 7 } }));
    });

    it('acking while disconnected is a no-op', () => {
      expect(() => client.ack(1)).not.toThrow();
    });
  });

  describe('heartbeat', () => {
    it('sends heartbeat frames on the interval', () => {
      const socket = connect();
      vi.advanceTimersByTime(1_000);
      expect(socket.frames().filter((f) => f.t === 'heartbeat')).toHaveLength(1);
    });

    it('stops sending heartbeats after disconnect', () => {
      const socket = connect();
      client.disconnect();
      socket.send.mockClear();
      vi.advanceTimersByTime(5_000);
      expect(socket.frames().filter((f) => f.t === 'heartbeat')).toHaveLength(0);
      expect(client.readyState).toBe(WebSocket.CLOSED);
    });

    it('a server heartbeat resets the missed count', () => {
      const socket = connect();
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(1_000);
        socket.receive(ServerEventType.HEARTBEAT, {}, 10 + i);
      }
      expect(socket.close).not.toHaveBeenCalled();
    });

    it('closes with an application code (not reserved 1006) after too many missed heartbeats', () => {
      const socket = connect();
      vi.advanceTimersByTime(3_000);
      expect(socket.close).toHaveBeenCalledTimes(1);
      const code = socket.close.mock.calls[0]?.[0] ?? 0;
      expect(code).toBeGreaterThanOrEqual(4000);
      expect(code).toBeLessThanOrEqual(4999);
      expect(actions.some((a) => a.type === WSActionType.HEARTBEAT_MISSED)).toBe(true);
    });
  });

  describe('reconnection', () => {
    it('reconnects with backoff after an unexpected close', () => {
      const listener = vi.fn();
      client.on('reconnecting', listener);
      const first = connect();
      first.drop();
      expect(listener).toHaveBeenCalledWith(1, expect.any(Number));
      expect(actions.some((a) => a.type === WSActionType.DISCONNECTED)).toBe(true);
      vi.advanceTimersByTime(30_000);
      expect(FakeSocket.last).not.toBe(first);
    });

    it('does not reconnect after an intentional disconnect', () => {
      const listener = vi.fn();
      client.on('reconnecting', listener);
      connect();
      client.disconnect();
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
