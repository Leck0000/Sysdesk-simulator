import React from 'react';
import ReactDOM from 'react-dom/client';
import './shared/styles/theme.css';
import './shared/styles/globals.css';
import { App } from './app/App';

const container = document.getElementById('root');
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
