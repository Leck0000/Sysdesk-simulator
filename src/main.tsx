import React from 'react';
import ReactDOM from 'react-dom/client';

export const App = () => {
  return (
    <div data-testid="app-root">Hello SysDesk</div>
  );
};

const container = document.getElementById('root');
if (container) {
  ReactDOM.createRoot(container!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}