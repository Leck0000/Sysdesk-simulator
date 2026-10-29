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
import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { z } from 'zod';
import { useSubsystemData } from './useSubsystemData';


// Registry key schema
const RegistryKeySchema = z.object({
  path: z.string(),
  value: z.string(),
  type: z.enum(['String', 'DWORD', 'QWORD', 'Binary']),
});

type RegistryKey = z.infer<typeof RegistryKeySchema>;

const registryKeysSchema = z.array(RegistryKeySchema);


/** RegistryEditorProps — props for RegistryEditor component */
interface RegistryEditorProps {
  windowId: string;
}

/** RegistryEditor — Registry simulated app window */
const RegistryEditor: React.FC<RegistryEditorProps> = ({ windowId }) => {
  const machineId = useSelector(
    (state: RootState) => {
      const windows = state.desktop.windows;
      const desktopWindow = windows.find((w) => w.id === windowId);
      return desktopWindow?.machineId ?? windowId;
    }
  );
  const subsystemData = useSubsystemData('registry', registryKeysSchema);
  const keys: RegistryKey[] = subsystemData.data ?? [];
  const isLoading = subsystemData.status === 'loading';
  const error = subsystemData.error;

  if (isLoading) {
    return (
      <div
        data-testid="registry-editor"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          padding: '16px',
        }}
        role="region"
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
        padding: '16px',
      }}
      role="region"
      aria-label={`Registry Editor for ${machineId}`}
    >

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

export { RegistryEditor };