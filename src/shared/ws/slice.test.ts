import { describe, it, expect } from 'vitest';
import wsReducer, { initialWSState } from './slice';
import { wsConnected, wsDisconnected, wsError, wsReconnecting } from './events';

describe('ws slice', () => {
  it('tracks the connection lifecycle', () => {
    let s = wsReducer(undefined, wsConnected({ sessionId: 'sid-1', capabilities: ['cmd'] }));
    expect(s).toMatchObject({ connected: true, sessionId: 'sid-1', capabilities: ['cmd'] });

    s = wsReducer(s, wsDisconnected({ code: 1006, reason: '', wasClean: false }));
    expect(s).toMatchObject({ connected: false, sessionId: null });

    s = wsReducer(s, wsReconnecting({ attempt: 2, maxAttempts: 10, nextRetryMs: 2000 }));
    expect(s).toMatchObject({ isReconnecting: true, reconnectAttempt: 2 });
  });

  it('records the last error', () => {
    const s = wsReducer(initialWSState, wsError({ message: 'boom', recoverable: true }));
    expect(s.lastError).toBe('boom');
  });
});
