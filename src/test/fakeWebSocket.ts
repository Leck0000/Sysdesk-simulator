/**
 * Minimal WebSocket stand-in for unit tests: records frames and lets a test
 * drive open / message / close. Install with vi.stubGlobal('WebSocket', FakeSocket).
 */
import { vi } from 'vitest';

export class FakeSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static last: FakeSocket | null = null;

  readyState = FakeSocket.OPEN;
  binaryType = 'blob';
  readonly url: string;
  send = vi.fn<(data: string) => void>();
  close = vi.fn<(code?: number, reason?: string) => void>();
  onopen: (() => void) | null = null;
  onclose: ((e: { code: number; reason: string; wasClean: boolean }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeSocket.last = this;
  }

  /** Frames written by the client, parsed. */
  frames(): Array<{ t: string; seq: number; payload: unknown }> {
    return this.send.mock.calls.map(([data]) => JSON.parse(data));
  }

  /** Deliver a server envelope to the client. */
  receive(t: string, payload: unknown, seq = 1): void {
    this.onmessage?.({
      data: JSON.stringify({ v: 1, t, sid: '1b84c7d2-9b0e-4527-bd82-ef0c2f5b6a1d', seq, ts: Date.now(), payload }),
    });
  }

  /** Simulate the connection dropping. */
  drop(code = 1006): void {
    this.readyState = FakeSocket.CLOSED;
    this.onclose?.({ code, reason: '', wasClean: false });
  }
}
