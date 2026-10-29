/*****
 * EventViewer — Event Viewer (Event Log) simulated app
 *
 * Consumes:
 *   - wsClient (state.delta events for Event Log subsystem)
 *   - desktopSlice (openWindow action)
 *
 * Produces: Event Viewer component reading Redux state
 *   (subsystem data synced via WS state.delta)
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

// Event Log state schema
const EventLogEntrySchema = z.object({
  id: z.string().uuid(),
  message: z.string(),
  level: z.enum(['Info', 'Warning', 'Error', 'SuccessAudit', 'FailureAudit']),
  category: z.string().optional(),
  timeGenerated: z.string(),
  eventId: z.string().optional(),
});

type EventLogEntry = z.infer<typeof EventLogEntrySchema>;

const eventLogEntrySchema = z.array(EventLogEntrySchema);

type EventLogState = {
  entries: EventLogEntry[];
  isFetching: boolean;
  error: string | null;
};

/** EventViewerProps — props for EventViewer component */
interface EventViewerProps {
  /** The windowId mapping to desktopSlice for machineId lookup */
  windowId: string;
}

/** EventViewer — Event Viewer simulated app window */
const EventViewer: React.FC<EventViewerProps> = ({ windowId }) => {
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
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to state.delta events for Event Log subsystem
  useEffect(() => {
    if (!sessionId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as unknown;
        if (data.t === 'state.delta' && data.payload?.subsystem === 'event-log') {
          const parsed = eventLogEntrySchema.safeParse(data.payload?.value);
          if (parsed.success) {
            setEventLog(parsed.data);
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
        data-testid="event-viewer"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '16px',
        }}
        role="dialog"
        aria-label={`Event Viewer for ${machineId}`}
      >
        <p>Loading Event Log...</p>
      </div>
    );
  }

  return (
    <div
      data-testid="event-viewer"
      style={{
        backgroundColor: 'var(--card)',
        color: 'var(--fg)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '16px',
      }}
      role="dialog"
      aria-label={`Event Viewer for ${machineId}`}
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
      >
        <span style={{ flexGrow: 1 }}>Event Viewer</span>
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
        {eventLog.length === 0 ? (
          <div style={{ color: 'var(--fg)', opacity: 0.5 }}>
            <p>No events logged yet.</p>
          </div>
        ) : (
          eventLog.map((entry: EventLogEntry) => (
            <div
              key={entry.id}
              style={{
                marginBottom: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '13px' }}>
                {entry.level}: {entry.message}
              </div>
              {entry.timeGenerated && (
                <div style={{ fontSize: '11px', color: 'var(--fg)', opacity: 0.5 }}>
                  {entry.timeGenerated}
                </div>
              )}
              {entry.eventId && (
                <div style={{ fontSize: '11px', color: 'var(--fg)', opacity: 0.5 }}>
                  Event ID: {entry.eventId}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/** LazyEventViewer — lazily loaded EventViewer with code-splitting */
const LazyEventViewer = React.lazy(() => import('./EventViewer'));

/** EventViewerWindow — Window chrome + EventViewer component */
const EventViewerWindow: React.FC<EventViewerProps> = ({ windowId }) => {
  return (
    <div
      data-testid="event-viewer-window"
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
        <span style={{ flexGrow: 1 }}>Event Viewer</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Control buttons would go here */}
        </div>
      </div>

      {/* Event content */}
      <LazyEventViewer windowId={windowId} />
    </div>
  );
};

export { EventViewer, EventViewerWindow };