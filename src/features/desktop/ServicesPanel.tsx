/*****
 * ServicesPanel — Services simulated app
 *
 * Consumes:
 *   - wsClient (state.delta events for Services subsystem)
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


// Service schema
const ServiceSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  status: z.enum(['running', 'stopped', 'paused', 'error']),
  startMode: z.enum(['auto', 'manual', 'disabled']),
});

type Service = z.infer<typeof ServiceSchema>;

const servicesSchema = z.array(ServiceSchema);


/** ServicesPanelProps — props for ServicesPanel component */
interface ServicesPanelProps {
  windowId: string;
}

/** ServicesPanel — Services simulated app window */
const ServicesPanel: React.FC<ServicesPanelProps> = ({ windowId }) => {
  const machineId = useSelector(
    (state: RootState) => {
      const windows = state.desktop.windows;
      const desktopWindow = windows.find((w) => w.id === windowId);
      return desktopWindow?.machineId ?? windowId;
    }
  );
  const subsystemData = useSubsystemData('services', servicesSchema);
  const services: Service[] = subsystemData.data ?? [];
  const isLoading = subsystemData.status === 'loading';
  const error = subsystemData.error;

  if (isLoading) {
    return (
      <div
        data-testid="ServicesPanel"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          padding: '16px',
        }}
        role="region"
        aria-label={`Services for ${machineId}`}
      >
        <p>Loading Services...</p>
      </div>
    );
  }

  return (
    <div
      data-testid="ServicesPanel"
      style={{
        backgroundColor: 'var(--card)',
        color: 'var(--fg)',
        padding: '16px',
      }}
      role="region"
      aria-label={`Services for ${machineId}`}
    >

      {error ? (
        <div style={{ color: 'var(--fg)', margin: '16px 0', fontSize: '12px' }}>
          <p>Error: {error}</p>
        </div>
      ) : null}

      <div style={{ margin: '16px 0', maxHeight: '400px', overflow: 'auto' }}>
        {services.length === 0 ? (
          <div style={{ color: 'var(--fg)', opacity: 0.5 }}>
            <p>No services running yet.</p>
          </div>
        ) : (
          services.map((service: Service) => (
            <div
              key={service.name}
              style={{
                marginBottom: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  color: 'var(--bg)',
                  backgroundColor: service.status === 'running' ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {service.status.toUpperCase()}
              </span>
              <span>{service.displayName}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export { ServicesPanel };