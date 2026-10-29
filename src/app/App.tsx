import { BrowserRouter } from 'react-router-dom';
import { Providers } from './providers';
import { AppRoutes } from './routes';

/** Root component: store + query providers, router (Vite base as basename), routes. */
export function App() {
  return (
    <Providers>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <div data-testid="app-root" className="min-h-screen bg-bg text-fg">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </Providers>
  );
}
