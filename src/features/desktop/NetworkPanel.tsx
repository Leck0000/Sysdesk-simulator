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
import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { z } from 'zod';
import { useSubsystemData } from './useSubsystemData';



const NetworkAdapterSchema = z.object({
  name: z.string(),
  status: z.enum(['up', 'down', 'degraded']),
  ip: z.union([z.ipv4(), z.ipv6()]).optional(),
  netmask: z.string().optional(),
  mac: z.string().optional(),
});

type NetworkAdapter = z.infer<typeof NetworkAdapterSchema>;

const adaptersSchema = z.array(NetworkAdapterSchema);


/** NetworkPanelProps — props for NetworkPanel component */
interface NetworkPanelProps {
  windowId: string;
}

/** NetworkPanel — Network simulated app window */
const NetworkPanel: React.FC<NetworkPanelProps> = ({ windowId }) => {
  const machineId = useSelector(
    (state: RootState) => {
      const windows = state.desktop.windows;
      const desktopWindow = windows.find((w) => w.id === windowId);
      return desktopWindow?.machineId ?? windowId;
    }
  );
  const subsystemData = useSubsystemData('network', adaptersSchema);
  const adapters: NetworkAdapter[] = subsystemData.data ?? [];
  const isLoading = subsystemData.status === 'loading';
  const error = subsystemData.error;

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

export { NetworkPanel };