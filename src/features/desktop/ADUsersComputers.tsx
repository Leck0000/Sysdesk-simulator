/*****
 * ADUsersComputers — Active Directory simulated app
 *
 * Consumes:
 *   - wsClient (state.delta events for Active Directory subsystem)
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

// AD User schema
const AdUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  distinguishedName: z.string(),
  enabled: z.boolean(),
  whenCreated: z.string(),
  lastLogon: z.string().optional(),
});

type AdUser = z.infer<typeof AdUserSchema>;

const adUsersSchema = z.array(AdUserSchema);

type AdState = {
  users: AdUser[];
  isFetching: boolean;
  error: string | null;
};

/** ADUsersComputersProps — props for ADUsersComputers component */
interface ADUsersComputersProps {
  windowId: string;
}

/** ADUsersComputers — Active Directory simulated app window */
const ADUsersComputers: React.FC<ADUsersComputersProps> = ({ windowId }) => {
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
  const [users, setUsers] = useState<AdUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to state.delta events for AD subsystem
  useEffect(() => {
    if (!sessionId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as unknown;
        if (data.t === 'state.delta' && data.payload?.subsystem === 'ad') {
          const parsed = adUsersSchema.safeParse(data.payload?.value);
          if (parsed.success) {
            setUsers(parsed.data);
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
        data-testid="ad-users-computers"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '16px',
        }}
        role="dialog"
        aria-label={`Active Directory for ${machineId}`}
      >
        <p>Loading Active Directory...</p>
      </div>
    );
  }

  return (
    <div
      data-testid="ad-users-computers"
      style={{
        backgroundColor: 'var(--card)',
        color: 'var(--fg)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '16px',
      }}
      role="dialog"
      aria-label={`Active Directory for ${machineId}`}
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
        <span style={{ flexGrow: 1 }}>Active Directory</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Control buttons would go here */}
        </div>
      </div>

      {error ? (
        <div style={{ color: 'var(--fg)', margin: '16px 0', fontSize: '12px' }}>
          <p>Error: {error}</p>
        </div>
      ) : null}

      <div style={{ margin: '16px 0', maxHeight: '500px', overflow: 'auto' }}>
        {users.length === 0 ? (
          <div style={{ color: 'var(--fg)', opacity: 0.5 }}>
            <p>No AD users yet.</p>
          </div>
        ) : (
          users.map((user: AdUser) => (
            <div
              key={user.id}
              style={{
                marginBottom: '6px',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{user.name}</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--fg)', opacity: 0.7 }}>
                {user.whenCreated.substring(0, 20)}{user.whenCreated.length > 20 ? '...' : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/** LazyADUsersComputers — lazily loaded ADUsersComputers with code-splitting */
const LazyADUsersComputers = React.lazy(() => import('./ADUsersComputers'));

/** ADUsersComputersWindow — Window chrome + ADUsersComputers component */
const ADUsersComputersWindow: React.FC<ADUsersComputersProps> = ({ windowId }) => {
  return (
    <div
      data-testid="ad-users-computers-window"
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
        <span style={{ flexGrow: 1 }}>Active Directory</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Control buttons would go here */}
        </div>
      </div>

      {/* AD content */}
      <LazyADUsersComputers windowId={windowId} />
    </div>
  );
};

export { ADUsersComputers, ADUsersComputersWindow };