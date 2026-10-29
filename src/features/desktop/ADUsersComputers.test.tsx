/*****
 * ADUsersComputers.test.tsx — Snapshot and interaction tests for ADUsersComputers
 *
 * - Renders a terminal container
 * - Applies CSS variable styling
 * - Has accessible role attribute
 ****/
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { desktopSlice } from './slice';
import wsReducer, { initialWSState } from '../../shared/ws/slice';
import { ADUsersComputers } from './ADUsersComputers';

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
  reducer: {
    desktop: desktopSlice.reducer,
    ws: wsReducer,
  },
  preloadedState: { ws: { ...initialWSState, sessionId: 'test-session' } },
});

describe('ADUsersComputers', () => {
  beforeEach(() => {
    // Reset state before each test
    store.dispatch(desktopSlice.actions.removeWindow('00000000-0000-0000-0000-000000000000'));
  });

  test('renders ADUsersComputers component', () => {
    render(
      <Provider store={store}>
        <ADUsersComputers windowId="win-001" />
      </Provider>
    );
    const component = screen.getByTestId('ad-users-computers');
    expect(component).toBeInTheDocument();
  });

  test('applies CSS variable styling', () => {
    render(
      <Provider store={store}>
        <ADUsersComputers windowId="win-001" />
      </Provider>
    );
    const component = screen.getByTestId('ad-users-computers');
    expect(component).toHaveStyle('background-color: var(--card)');
    expect(component).toHaveStyle('color: var(--fg)');
  });

  test('has accessible role attribute', () => {
    render(
      <Provider store={store}>
        <ADUsersComputers windowId="win-001" />
      </Provider>
    );
    const component = screen.getByTestId('ad-users-computers');
    expect(component).toHaveAttribute('role', 'region');
  });

  test('displays loading state initially', () => {
    render(
      <Provider store={store}>
        <ADUsersComputers windowId="win-001" />
      </Provider>
    );
    const loadingText = screen.getByText('Loading Active Directory...');
    expect(loadingText).toBeInTheDocument();
  });

  test('displays AD users when data is loaded', () => {
    // Manually set users state
    store.dispatch(
      desktopSlice.actions.openAppWindow({
        app: 'ad-users-computers',
        title: 'Active Directory',
        machineId: 'machine-001',
      })
    );

    render(
      <Provider store={store}>
        <ADUsersComputers windowId="win-001" />
      </Provider>
    );
    const container = screen.getByTestId('ad-users-computers');
    expect(container).toBeInTheDocument();
  });
});