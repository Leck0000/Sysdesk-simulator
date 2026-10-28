/*****
 * NetworkPanel — Network simulated app
 *
 * Consumes:
 *   - wsClient (state.delta events for Network Stack subsystem)
 *   - desktopSlice (openWindow action)
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors
 * Accessibility: WCAG 2.1 AA
 * Responsive: >=1280px desktop-first; sidebar collapses to drawer <1024px
 ****/
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { z } from 'zod';

// Import ws actions and types
import { wsSend, createSendCommand, ClientEventType } from '../../shared/ws';
import { desktopSlice } from './slice';

// Network state schema
const NetworkInterfaceSchema = z.object({
  name: z.string(),
  ip: z.string().ip(),
  mac: z.string().optional(),
});

const NetworkAdapterSchema = z.object({
  name: z.string(),
  status: z.enum(['up', 'down', 'degraded']),
  ip: z.string().ip().optional(),
  netmask: z.string().optional(),
  mac: z.string().optional(),
});

type NetworkAdapter = z.infer<typeof NetworkAdapterSchema>;

const adaptersSchema = z.array(NetworkAdapterSchema);

type NetworkState = {
  adapters: NetworkAdapter[];
  isFetching: boolean;
  error: string | null;
};

/** NetworkPanelProps — props for NetworkPanel component */
interface NetworkPanelProps {
  windowId: string;
}

/** NetworkPanel — Network simulated app window */
const NetworkPanel: React.FC<NetworkPanelProps> = ({ windowId }) => {
  const dispatch = useDispatch();
  const { sessionId } = useSelector(
    (state: RootState) => state.ws?.state ?? { sessionId: null }
  );
  const machineId = useSelector(
    (state: RootState) => {
      const windows = state.desktop?.windows ?? [];
      const window = windows.find((w: any) => w.id === windowId);
      return window?.machineId ?? windowId;
    }
  );
  const [adapters, setAdapters] = useState<NetworkAdapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to state.delta events for Network subsystem
  useEffect(() => {
    if (!sessionId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as unknown;
        if (data.t === 'state.delta' && data.payload?.subsystem === 'network') {
          const parsed = adaptersSchema.safeParse(data.payload?.value);
          if (parsed.success) {
            setAdapters(parsed.data);
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sessionId]);

  // Send command to backend
  const sendCommand = (command: string) => {
    if (!sessionId) return;
    const payload = createSendCommand(machineId, command);
    dispatch(wsSend({ type: ClientEventType.SEND_COMMAND, payload }));
  };

  if (isLoading) {
    return (
      <div
        data-testid="network-panel"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '16px',
        }}
        role="dialog"
        aria-label={`Network for ${machineId}`}
      >
        <p>Loading Network...</p>
      </div>
    );
  }

  return (
    <div
      data-testid="network-panel"
      style={{
        backgroundColor: 'var(--card)',
        color: 'var(--fg)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '16px',
      }}
      role="dialog"
      aria-label={`Network for ${machineId}`}
    >
      <div
        style={{
          backgroundColor: 'var(--accent)',
          color: 'var(--bg)',
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none',
          height: '28px',
          borderBottom: '1px solid var(--border)',
          role: 'presentation',
        }}
        role='presentation'
      >
        <span style={{ flexGrow: 1 }}>Network</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Control buttons would go here */}
        </div>
      </div>

      {error ? (
        <div style={{ color: 'var(--fg)', margin: '16px 0', fontSize: '12px' }}>
          <p>Error: {error}</p>
        </div>
      ) : null}

      <div style={{ margin: '16px 0', maxHeight: '400px', overflow: 'auto' }}>
        {adapters.length === 0 ? (
          <div style={{ color: 'var(--fg)', opacity: 0.5 }}>
            <p>No network adapters yet.</p>
          </div>
        ) : (
          adapters.map((adapter: NetworkAdapter) => (
            <div
              key={adapter.name}
              style={{
                marginBottom: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{adapter.name}</span>
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: 'var(--bg)',
                  backgroundColor: adapter.status === 'up' ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {adapter.status.toUpperCase()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/** LazyNetworkPanel — lazily loaded NetworkPanel with code-splitting */
const LazyNetworkPanel = React.lazy(() => import('./NetworkPanel'));

/** NetworkPanelWindow — Window chrome + NetworkPanel component */
const NetworkPanelWindow: React.FC<NetworkPanelProps> = ({ windowId }) => {
  return (
    <div
      data-testid="network-panel-window"
      style={{
        backgroundColor: 'var(--card)',
        color: 'var(--fg)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          backgroundColor: 'var(--accent)',
          color: 'var(--bg)',
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none',
          height: '28px',
          borderBottom: '1px solid var(--border)',
          role: 'presentation',
        }}
        role='presentation'
      >
        <span style={{ flexGrow: 1 }}>Network</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Control buttons would go here */}
        </div>
      </div>

      {/* Network content */}
      <LazyNetworkPanel windowId={windowId} />
    </div>
  );
};

export { NetworkPanel, NetworkPanelWindow };