/*****
 * RegistryEditor — Registry simulated app
 *
 * Consumes:
 *   - wsClient (state.delta events for Registry subsystem)
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

// Registry key schema
const RegistryKeySchema = z.object({
  path: z.string(),
  value: z.string(),
  type: z.enum(['String', 'DWORD', 'QWORD', 'Binary']),
});

type RegistryKey = z.infer<typeof RegistryKeySchema>;

const registryKeysSchema = z.array(RegistryKeySchema);

type RegistryState = {
  keys: RegistryKey[];
  isFetching: boolean;
  error: string | null;
};

/** RegistryEditorProps — props for RegistryEditor component */
interface RegistryEditorProps {
  windowId: string;
}

/** RegistryEditor — Registry simulated app window */
const RegistryEditor: React.FC<RegistryEditorProps> = ({ windowId }) => {
  const dispatch = useDispatch();
  const { sessionId } = useSelector(
    (state: RootState) => state.ws
  );
  const machineId = useSelector(
    (state: RootState) => {
      const windows = state.desktop.windows;
      const desktopWindow = windows.find((w) => w.id === windowId);
      return desktopWindow?.machineId ?? windowId;
    }
  );
  const [keys, setKeys] = useState<RegistryKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to state.delta events for Registry subsystem
  useEffect(() => {
    if (!sessionId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as unknown;
        if (data.t === 'state.delta' && data.payload?.subsystem === 'registry') {
          const parsed = registryKeysSchema.safeParse(data.payload?.value);
          if (parsed.success) {
            setKeys(parsed.data);
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
        data-testid="registry-editor"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '16px',
        }}
        role="dialog"
        aria-label={`Registry Editor for ${machineId}`}
      >
        <p>Loading Registry...</p>
      </div>
    );
  }

  return (
    <div
      data-testid="registry-editor"
      style={{
        backgroundColor: 'var(--card)',
        color: 'var(--fg)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '16px',
      }}
      role="dialog"
      aria-label={`Registry Editor for ${machineId}`}
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
        <span style={{ flexGrow: 1 }}>Registry Editor</span>
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
        {keys.length === 0 ? (
          <div style={{ color: 'var(--fg)', opacity: 0.5 }}>
            <p>No registry keys yet.</p>
          </div>
        ) : (
          keys.map((key: RegistryKey) => (
            <div
              key={key.path}
              style={{
                marginBottom: '6px',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{key.path}</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--fg)', opacity: 0.7 }}>
                {key.value.substring(0, 50)}{key.value.length > 50 ? '...' : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/** LazyRegistryEditor — lazily loaded RegistryEditor with code-splitting */
const LazyRegistryEditor = React.lazy(() => import('./RegistryEditor'));

/** RegistryEditorWindow — Window chrome + RegistryEditor component */
const RegistryEditorWindow: React.FC<RegistryEditorProps> = ({ windowId }) => {
  return (
    <div
      data-testid="registry-editor-window"
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
        <span style={{ flexGrow: 1 }}>Registry Editor</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Control buttons would go here */}
        </div>
      </div>

      {/* Registry content */}
      <LazyRegistryEditor windowId={windowId} />
    </div>
  );
};

export { RegistryEditor, RegistryEditorWindow };