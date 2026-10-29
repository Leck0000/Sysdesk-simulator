import authReducer from '../auth/slice';
import certificatesReducer from './slice';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { VerificationPage } from './VerificationPage';

// Mock window.matchMedia for responsive tests
global.matchMedia = global.matchMedia || ((params: string) => ({
  matches: false,
  media: params,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

const store = configureStore({
  reducer: { auth: authReducer, certificates: certificatesReducer },
});

describe('VerificationPage', () => {
  beforeEach(() => {
    // Reset state before each test
    store.dispatch(({ type }) => {
      // No-op reset
    });
  });

  test('renders VerificationPage component', () => {
    render(
      <Provider store={store}>
        <VerificationPage />
      </Provider>
    );
    const component = screen.getByRole('region', { name: 'Certificate verification page' });
    expect(component).toBeInTheDocument();
  });

  test('shows verification form initially when no certificate ID provided', () => {
    render(
      <Provider store={store}>
        <VerificationPage />
      </Provider>
    );
    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
  });

  test('displays verification result with valid certificate data', () => {
      render(
        <Provider store={store}>
          <VerificationPage
            verificationResult={{ valid: true, payload: { ticket_type: 'bug', ticket_id: 'tb123', score: 85, criteria_met: { c1: 20 }, rubric_hash: 'abc123', issued_at: 1730102400000 }, signature: 'b64...' }}
          />
        </Provider>
      );
      const result = screen.getByText('Certificate Valid');
      expect(result).toBeInTheDocument();
    });

    test('displays verification result with invalid certificate', () => {
      render(
        <Provider store={store}>
          <VerificationPage
            verificationResult={{ valid: false, error: 'Signature invalid' }}
          />
        </Provider>
      );
      const error = screen.getByText('Certificate Invalid');
      expect(error).toBeInTheDocument();
    });

    test('shows loading state when isLoading prop is true', () => {
      render(
        <Provider store={store}>
          <VerificationPage isLoading={true} />
        </Provider>
      );
      const loading = screen.getByText('Verifying certificate...');
      expect(loading).toBeInTheDocument();
    });
});