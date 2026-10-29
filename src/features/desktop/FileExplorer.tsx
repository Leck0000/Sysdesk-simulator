/*****
 * FileExplorer — File Explorer simulated app
 *
 * Consumes:
 *   - wsClient (state.delta events for Filesystem subsystem)
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

// Filesystem drive schema
const FilesystemDriveSchema = z.object({
  letter: z.string(),
  fsType: z.string(),
  sizeBytes: z.number(),
  freeBytes: z.number(),
});

type FilesystemDrive = z.infer<typeof FilesystemDriveSchema>;

const drivesSchema = z.array(FilesystemDriveSchema);

type FSState = {
  drives: FilesystemDrive[];
  isFetching: boolean;
  error: string | null;
};

/** FileExplorerProps — props for FileExplorer component */
interface FileExplorerProps {
  windowId: string;
}

/** FileExplorer — File Explorer simulated app window */
const FileExplorer: React.FC<FileExplorerProps> = ({ windowId }) => {
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
  const [drives, setDrives] = useState<FilesystemDrive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to state.delta events for Filesystem subsystem
  useEffect(() => {
    if (!sessionId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as unknown;
        if (data.t === 'state.delta' && data.payload?.subsystem === 'filesystem') {
          const parsed = drivesSchema.safeParse(data.payload?.value);
          if (parsed.success) {
            setDrives(parsed.data);
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
        data-testid="file-explorer"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '16px',
        }}
        role="dialog"
        aria-label={`File Explorer for ${machineId}`}
      >
        <p>Loading File Explorer...</p>
      </div>
    );
  }

  return (
    <div
      data-testid="file-explorer"
      style={{
        backgroundColor: 'var(--card)',
        color: 'var(--fg)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '16px',
      }}
      role="dialog"
      aria-label={`File Explorer for ${machineId}`}
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
        <span style={{ flexGrow: 1 }}>File Explorer</span>
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
        {drives.length === 0 ? (
          <div style={{ color: 'var(--fg)', opacity: 0.5 }}>
            <p>No drives yet.</p>
          </div>
        ) : (
          drives.map((drive: FilesystemDrive) => (
            <div
              key={drive.letter}
              style={{
                marginBottom: '6px',
                paddingBottom: '6px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{drive.letter}:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--fg)', opacity: 0.7 }}>
                {drive.fsType} ({drive.freeBytes.toLocaleString()} free of {drive.sizeBytes.toLocaleString()})
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/** LazyFileExplorer — lazily loaded FileExplorer with code-splitting */
const LazyFileExplorer = React.lazy(() => import('./FileExplorer'));

/** FileExplorerWindow — Window chrome + FileExplorer component */
const FileExplorerWindow: React.FC<FileExplorerProps> = ({ windowId }) => {
  return (
    <div
      data-testid="file-explorer-window"
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
        <span style={{ flexGrow: 1 }}>File Explorer</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Control buttons would go here */}
        </div>
      </div>

      {/* File content */}
      <LazyFileExplorer windowId={windowId} />
    </div>
  );
};

export { FileExplorer, FileExplorerWindow };