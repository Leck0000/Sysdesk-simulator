import { Routes, Route, Link } from 'react-router-dom';

export function RoutesComponent() {
  return (
    <Routes>
      <Route path="/" element={<div data-testid="app-root">Home</div>} />
    </Routes>
  );
}