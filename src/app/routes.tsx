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

// Fallback for Suspense
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
        <Route path="/team" element={<Team />} />
        <Route path="/certificates" element={<Certificates />} />
      </Routes>
    </Suspense>
  );
}
