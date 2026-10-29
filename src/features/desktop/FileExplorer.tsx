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
import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { z } from 'zod';
import { useSubsystemData } from './useSubsystemData';


// Filesystem drive schema
const FilesystemDriveSchema = z.object({
  letter: z.string(),
  fsType: z.string(),
  sizeBytes: z.number(),
  freeBytes: z.number(),
});

type FilesystemDrive = z.infer<typeof FilesystemDriveSchema>;

const drivesSchema = z.array(FilesystemDriveSchema);


/** FileExplorerProps — props for FileExplorer component */
interface FileExplorerProps {
  windowId: string;
}

/** FileExplorer — File Explorer simulated app window */
const FileExplorer: React.FC<FileExplorerProps> = ({ windowId }) => {
  const machineId = useSelector(
    (state: RootState) => {
      const windows = state.desktop.windows;
      const desktopWindow = windows.find((w) => w.id === windowId);
      return desktopWindow?.machineId ?? windowId;
    }
  );
  const subsystemData = useSubsystemData('filesystem', drivesSchema);
  const drives: FilesystemDrive[] = subsystemData.data ?? [];
  const isLoading = subsystemData.status === 'loading';
  const error = subsystemData.error;

  if (isLoading) {
    return (
      <div
        data-testid="file-explorer"
        style={{
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          padding: '16px',
        }}
        role="region"
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
        padding: '16px',
      }}
      role="region"
      aria-label={`File Explorer for ${machineId}`}
    >

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

export { FileExplorer };