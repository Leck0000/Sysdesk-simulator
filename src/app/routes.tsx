import { Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';

// Lazy-loaded feature components
const Home = () => null;
const Auth = () => null;
const Tickets = () => null;
const Desktop = () => null;
const Communication = () => null;
const Scoring = () => null;
const Team = () => null;
const Certificates = () => null;
const BulkImport = () => null;

// Lazy-loaded components with code splitting
const CohortDashboard = () => import('../features/team/CohortDashboard.tsx').then((mod) => mod.CohortDashboard);
const AssignmentView = () => import('../features/team/AssignmentView.tsx').then((mod) => mod.AssignmentView);
const ProgressStream = () => import('../features/team/ProgressStream.tsx').then((mod) => mod.ProgressStream);

const LoadingComponent = () => (
  <div data-testid="loading-spinner">Loading...</div>
);

export function RoutesComponent() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <Routes>
        <Route path="/" element={<div data-testid="app-root" />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/desktop" element={<Desktop />} />
        <Route path="/communication" element={<Communication />} />
        <Route path="/scoring" element={<Scoring />} />
        <Route path="/team" element={<CohortDashboard />} />
        <Route path="/team/assignment/:assignmentId" element={<AssignmentView />} />
        <Route path="/team/progress-stream" element={<ProgressStream />} />
        <Route path="/team/bulk-import" element={<BulkImport />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/verify/:type/:id" element={<VerificationPage />} />
      </Routes>
    </Suspense>
  );
}
