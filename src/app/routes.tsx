import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Workspace } from '../features/layout/Workspace';

// Secondary screens are code-split; the workspace is the landing page.
const CohortDashboard = lazy(() =>
  import('../features/team/CohortDashboard').then((m) => ({ default: m.CohortDashboard }))
);
const AssignmentView = lazy(() =>
  import('../features/team/AssignmentView').then((m) => ({ default: m.AssignmentView }))
);
const ProgressStream = lazy(() =>
  import('../features/team/ProgressStream').then((m) => ({ default: m.ProgressStream }))
);
const BulkImport = lazy(() => import('../features/team/BulkImport').then((m) => ({ default: m.BulkImport })));
const CertificateGallery = lazy(() =>
  import('../features/certificates/Gallery').then((m) => ({ default: m.CertificateGallery }))
);
const ScoreDashboard = lazy(() =>
  import('../features/scoring/ScoreDashboard').then((m) => ({ default: m.ScoreDashboard }))
);
const LoginForm = lazy(() => import('../features/auth/LoginForm').then((m) => ({ default: m.LoginForm })));

function Loading() {
  return (
    <div data-testid="loading-spinner" className="p-8 text-muted">
      Loading…
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Workspace />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/scoring" element={<ScoreDashboard />} />
        <Route path="/team" element={<CohortDashboard />} />
        <Route path="/team/assignment/:assignmentId" element={<AssignmentView />} />
        <Route path="/team/progress-stream" element={<ProgressStream />} />
        <Route path="/team/bulk-import" element={<BulkImport />} />
        <Route path="/certificates" element={<CertificateGallery />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
