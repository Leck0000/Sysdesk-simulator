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
import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { z } from 'zod';
import { useSubsystemData } from './useSubsystemData';


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


/** ADUsersComputersProps — props for ADUsersComputers component */
interface ADUsersComputersProps {
  windowId: string;
}

/** ADUsersComputers — Active Directory simulated app window */
const ADUsersComputers: React.FC<ADUsersComputersProps> = ({ windowId }) => {
  const machineId = useSelector(
    (state: RootState) => {
      const windows = state.desktop.windows;
      const desktopWindow = windows.find((w) => w.id === windowId);
      return desktopWindow?.machineId ?? windowId;
    }
  );
  const subsystemData = useSubsystemData('ad', adUsersSchema);
  const users: AdUser[] = subsystemData.data ?? [];
  const isLoading = subsystemData.status === 'loading';
  const error = subsystemData.error;

  if (isLoading) {
    return (
      <div
        data-testid="ad-users-computers"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          padding: '16px',
        }}
        role="region"
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
        padding: '16px',
      }}
      role="region"
      aria-label={`Active Directory for ${machineId}`}
    >

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

export { ADUsersComputers };