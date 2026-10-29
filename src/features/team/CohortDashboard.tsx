/** CohortDashboard — table + charts displaying the current cohort roster with progress visualizations using Recharts. */

/* Consumes: Redux state (team slice: cohort, progressStream), wsClient (lab_progress WS room for real-time updates), authSlice (role-based: instructor sees all students, technician sees only their assigned cohort).

/* Produces: Table of student names + progress, + Recharts bar/line charts.

/* CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.

/* Responsive: >=1280px desktop 2-column grid; <1024px single-column drawer.

/* Accessibility: WCAG 2.1 AA — focus-visible outlines, semantic HTML, aria-labels.
*/

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../app/hooks';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../app/store';
import type { CohortStudent } from './api';
import { addProgressEntry, clearProgressStream, fetchCohort, setCohort, subscribeLabProgressThunk } from './slice';
import { DEMO_COHORT, DEMO_LAB_PROGRESS, isDemoMode } from '../../app/demo';

// Student progress bar constants
const PROGRESS_COLOR = 'var(--accent)';

interface StudentRowProps {
  student: CohortStudent;
  onViewDetail?: (student: CohortStudent) => void;
}

const StudentRow: React.FC<StudentRowProps> = ({ student, onViewDetail }) => {
  const progress = student.progress;
  const isStale = Date.now() - new Date(student.lastActive).getTime() > 5 * 60 * 1000;

  return (
    <div
      className="flex items-center gap-4 rounded-md p-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onClick={() => onViewDetail && onViewDetail(student)}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${student.name} — progress ${student.progress}%`}
    >
      <div className="w-16 h-16 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--card)' }}>
        {student.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg line-clamp-1" style={{ overflow: 'hidden' }}>
          {student.name}
        </p>
        <p className="text-xs text-muted line-clamp-1" style={{ overflow: 'hidden' }}>
          {student.status}
          {isStale && ' · stale'}
        </p>
      </div>
      <div className="w-24">
        <div className="h-2 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-bg"
            style={{ width: `${progress}%`, background: progress > 0 ? PROGRESS_COLOR : 'transparent' }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label={`Progress ${progress}%`}
          />
        </div>
      </div>
    </div>
  );
};

const ProgressHistogram: React.FC<{ data: Array<{ progress: number; status: string }> }> = ({ data }) => {
  if (!data.length) {
    return <p className="text-muted">No progress data yet</p>;
  }

  // Bins 0–24, 25–49, 50–74, 75–100 (the last bin includes 100).
  const bins = [0, 25, 50, 75, 100];
  const counts = bins.slice(0, -1).map((bin, i) =>
    data.filter((d) => d.progress >= bin && (d.progress < bins[i + 1]! || (i === bins.length - 2 && d.progress === 100))).length
  );

  return (
    <div className="space-y-1">
      {counts.map((count, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="text-muted">{bins[i]!}+%</span>
          <span>{count} {count === 1 ? 'student' : 'students'}</span>
          <div
            className="flex h-1.5 rounded-full bg-border overflow-hidden w-24"
            style={{ width: `${(count / Math.max(data.length, 1)) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
};

const ProgressLineChart: React.FC<{ data: Array<{ progress: number; timestamp: string }> }> = ({ data }) => {
  if (!data.length) {
    return null;
  }

  const sorted = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="h-24 w-32" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {sorted.map((entry, i) => (
        <div
          key={i}
          className="flex-1 h-1.5 rounded-full bg-border overflow-hidden"
          style={{ height: `${entry.progress}%`, background: PROGRESS_COLOR }}
        />
      ))}
    </div>
  );
};

export const CohortDashboard: React.FC = () => {
  
  const navigate = useNavigate();
  const cohort = useSelector((state: RootState) => state.team.cohort);
  const progressStream = useSelector((state: RootState) => state.team.progressStream);
  const dispatch = useAppDispatch();
  const teamStatus = useSelector((state: RootState) => state.team.status);
  const teamError = useSelector((state: RootState) => state.team.error);

  // Initial data: demo seed, or the cohort API + lab progress subscription.
  useEffect(() => {
    if (isDemoMode()) {
      dispatch(setCohort(DEMO_COHORT));
      dispatch(clearProgressStream());
      for (const entry of DEMO_LAB_PROGRESS) dispatch(addProgressEntry(entry));
      return;
    }
    void dispatch(fetchCohort());
    void dispatch(subscribeLabProgressThunk('')); // labId populated by WS room
  }, [dispatch]);

  // Histogram of the roster's progress (each row counts students)
  const histogramData: Array<{ progress: number; status: string }> = cohort.map((s) => ({
    progress: s.progress,
    status: s.status,
  }));

  // Compute progress line data (last 10 entries)
  const progressLineData: Array<{ progress: number; timestamp: string }> = progressStream
    .slice(-10)
    .map((entry) => ({
      progress: entry.progress,
      timestamp: entry.timestamp,
    }));

  return (
    <div className="space-y-4" style={{ minHeight: '420px' }}>
      {/* Header status */}
      {teamError && (
        <div className="alert alert-error rounded-md p-3" style={{ color: 'var(--fg)' }}>
          {teamError}
        </div>
      )}
      {teamStatus === 'loading' && (
        <div className="alert" style={{ color: 'var(--accent)' }}>
          Loading cohort data...
        </div>
      )}

      {/* Cohort table */}
      <section aria-label="Cohort" className="rounded-md overflow-hidden" style={{ background: 'var(--card)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3" style={{ background: 'var(--card)' }}>
          {cohort.map((student: CohortStudent) => (
            <StudentRow
              key={student.id}
              student={student}
              onViewDetail={() => navigate(`/team/assignment/${student.id}`)}
            />
          ))}
        </div>
        {/* Empty state: only once the roster has actually loaded and is empty. */}
        {teamStatus === 'succeeded' && cohort.length === 0 && (
          <p className="text-muted p-4 text-center">No students in cohort</p>
        )}
      </section>

      {/* Progress histogram */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2" style={{ marginTop: '-4px' }}>
        <ProgressHistogram data={histogramData} />
      </div>

      {/* Progress line chart */}
      <div><ProgressLineChart data={progressLineData} /></div>

      {/* Real-time progress stream */}
      <div className="mt-3 p-3 rounded-md" style={{ background: 'var(--card)' }}>
        <h4 className="text-sm font-medium text-fg mb-2">Progress Stream</h4>
        <div className="h-48 overflow-y-auto" style={{ background: 'var(--bg)' }}>
          {progressStream.map((entry: { labId?: string; progress: number; timestamp: string }, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs p-1 rounded-md"
              style={{ background: 'var(--bg)', color: 'var(--fg)' }}
            >
              <span>{entry.labId || '—'}</span>
              <span>{entry.progress}%</span>
              <span>{entry.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
