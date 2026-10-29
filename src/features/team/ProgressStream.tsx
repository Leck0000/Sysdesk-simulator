/** ProgressStream — real-time progress stream display for lab assignments.

/* Consumes: Redux state (team slice: progressStream), wsClient (lab_progress
   WS room subscription), authSlice (role-based viewing).

/* Produces: Real-time progress stream with live updates, student assignments,
   machine progress visualizations.

/* CSS variables for theming: --fg, --bg, --accent, --border, --card — no
   hardcoded colors.

/* Responsive: >=1280px desktop multi-column; <1024px single-column drawer.

/* Accessibility: WCAG 2.1 AA — focus-visible outlines, semantic HTML,
   aria-labels, live region announcements.
*/

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectProgressStream, selectTeamStatus, selectTeamError } from './api';
import { clearProgressStream } from './slice';

export const ProgressStream: React.FC = () => {
  const dispatch = useDispatch();
  const progressStream = useSelector(
    (state: RootState) => state.team.progressStream
  );
  const teamStatus = useSelector((state: RootState) => state.team.status);
  const teamError = useSelector((state: RootState) => state.team.error);

  // Effect: subscribe to WS lab progress events
  useEffect(() => {
    dispatch(subscribeLabProgressThunk(''));
  }, [dispatch]);

  // Live region for screen readers
  const liveRegionId = `progress-live-${Date.now()}`;

  return (
    <div className="space-y-4" style={{ minHeight: '400px' }}>
      {teamError && (
        <div className="alert alert-error rounded-md p-3" style={{ color: 'var(--fg)' }}>
          {teamError}
        </div>
      )}

      {teamStatus === 'loading' && (
        <div className="alert" style={{ color: 'var(--accent)' }}>
          Loading progress stream...
        </div>
      )}

      {/* Live region announcement */}
      <div
        aria-live="polite"
        aria-atomic="true"
        aria-busy={teamStatus === 'loading'}
        role="status"
        id={liveRegionId}
        className="sr-only"
      >
        Progress stream updates
      </div>

      {/* Progress stream table */}
      <div className="rounded-md overflow-hidden" style={{ background: 'var(--card)' }}>
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
          <h3 className="text-font-medium text-fg row-span-1">
            Progress Stream <span className="text-xs text-muted">({progressStream.length})</span>
          </h3>
        </div>
        <div className="h-64 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          {progressStream.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md p-1 transition-colors duration-150"
              style={{
                background: 'var(--bg)',
                color: 'var(--fg)',
                marginBottom: '2px',
              }}
            >
              <span className="w-16 h-16 rounded-md flex items-center justify-center shrink-0"
                style={{ background: 'var(--card)' }}>
                {entry.labId ? entry.labId.substring(0, 3) : '—'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {entry.labId || 'Unassigned lab'}
                </p>
                <p className="text-xs text-muted truncate">
                  Progress: {entry.progress}%
                </p>
              </div>
              <div>
                <span className="text-xs"
                  style={{ color: entry.progress > 80 ? 'var(--accent)' : 'var(--fg)' }}>
                    {entry.progress}%
                  </span>
              </div>
            </div>
          ))}
          {progressStream.length === 0 && (
            <p className="text-muted text-center py-8">
              No progress updates yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

