/**
 * wsMiddleware integration test: a ws/send command must reach the socket
 * exactly once. WSClient.send() reports success as ws/sent (a notification),
 * never as ws/send (the command), so the middleware cannot re-enter itself.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { configureStore, type UnknownAction } from '@reduxjs/toolkit';
import { wsMiddleware } from './wsMiddleware';
import { WSClient } from '../ws/client';
import { wsConnect, wsSend, createSendCommand, ClientEventType, WSActionType } from '../ws/events';

class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = FakeSocket.OPEN;
  binaryType = 'blob';
  send = vi.fn();
  close = vi.fn();
  onopen: (() => void) | null = null;
  onclose: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessage: ((e: unknown) => void) | null = null;
  static last: FakeSocket | null = null;
  constructor() {
    FakeSocket.last = this;
  }
}

describe('wsMiddleware send path', () => {
  afterEach(() => {
    WSClient.resetInstance();
    vi.unstubAllGlobals();
  });

  it('writes one frame per ws/send and dispatches ws/sent, not ws/send', () => {
    vi.stubGlobal('WebSocket', FakeSocket);
    const seen: string[] = [];
    const recorder = () => (next: (a: unknown) => unknown) => (action: unknown) => {
      seen.push((action as UnknownAction).type);
      return next(action);
    };
    const store = configureStore({
      reducer: { auth: (state: { accessToken?: string } = {}) => state },
      middleware: (gdm) => gdm({ serializableCheck: false }).concat(recorder, wsMiddleware),
    });

    store.dispatch(wsConnect({ url: 'ws://test/ws' }));
    const socket = FakeSocket.last;
    expect(socket).not.toBeNull();

    store.dispatch(
      wsSend({ type: ClientEventType.SEND_COMMAND, payload: createSendCommand('m1', 'ipconfig') })
    );

    expect(socket?.send).toHaveBeenCalledTimes(1);
    expect(seen.filter((t) => t === WSActionType.SEND)).toHaveLength(1);
    expect(seen).toContain(WSActionType.SENT);
  });
});
