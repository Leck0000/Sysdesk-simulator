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
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { z } from 'zod';

// Import ws actions and types
import { wsSend, createSendCommand, ClientEventType } from '../../shared/ws';
import { desktopSlice } from './slice';
import type { DesktopWindow } from './slice';

// Service schema
const ServiceSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  status: z.enum(['running', 'stopped', 'paused', 'error']),
  startMode: z.enum(['auto', 'manual', 'disabled']),
});

type Service = z.infer<typeof ServiceSchema>;

const servicesSchema = z.array(ServiceSchema);

type ServicesState = {
  services: Service[];
  isFetching: boolean;
  error: string | null;
};

/** ServicesPanelProps — props for ServicesPanel component */
interface ServicesPanelProps {
  windowId: string;
}

/** ServicesPanel — Services simulated app window */
const ServicesPanel: React.FC<ServicesPanelProps> = ({ windowId }) => {
  const dispatch = useDispatch();
  const { sessionId } = useSelector(
    (state: RootState) => state.ws?.state ?? { sessionId: null }
  );
  const machineId = useSelector(
    (state: RootState) => {
      const windows = state.desktop?.windows ?? [];
      const desktopWindow = windows.find((w: DesktopWindow) => w.id === windowId);
      return desktopWindow?.machineId ?? windowId;
    }
  );
  [servicesSchema];
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to state.delta events for Services subsystem
  useEffect(() => {
    if (!sessionId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as unknown;
        if (data.t === 'state.delta' && data.payload?.subsystem === 'services') {
          const parsed = servicesSchema.safeParse(data.payload?.value);
          if (parsed.success) {
            setServices(parsed.data);
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
        data-testid="services-panel"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '16px',
        }}
        role="dialog"
        aria-label={`Services for ${machineId}`}
      >
        <p>Loading Services...</p>
      </div>
    );
  }

  return (
    <div
      data-testid="services-panel"
      style={{
        backgroundColor: 'var(--card)',
        color: 'var(--fg)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '16px',
      }}
      role="dialog"
      aria-label={`Services for ${machineId}`}
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
        <span style={{ flexGrow: 1 }}>Services</span>
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

/** LazyServicesPanel — lazily loaded ServicesPanel with code-splitting */
const LazyServicesPanel = React.lazy(() => import('./ServicesPanel'));

/** ServicesPanelWindow — Window chrome + ServicesPanel component */
const ServicesPanelWindow: React.FC<ServicesPanelProps> = ({ windowId }) => {
  return (
    <div
      data-testid="services-panel-window"
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
        <span style={{ flexGrow: 1 }}>Services</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Control buttons would go here */}
        </div>
      </div>

      {/* Services content */}
      <LazyServicesPanel windowId={windowId} />
    </div>
  );
};

export { ServicesPanel, ServicesPanelWindow };