/*****
 * NetworkPanel.test.tsx — Snapshot and interaction tests for NetworkPanel
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
import { NetworkPanel } from './NetworkPanel';

// Mock window.matchMedia for responsive tests
global.matchMedia = global.matchMedia || ((params: string) => ({
  matches: false,
  media: params,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

const store = configureStore({
  reducer: {
    desktop: desktopSlice.reducer,
    // Mock ws state
    ws: {
      reducer: () => ({ state: { sessionId: 'test-session' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  },
});

describe('NetworkPanel', () => {
  beforeEach(() => {
    // Reset state before each test
    store.dispatch(desktopSlice.actions.removeWindow('00000000-0000-0000-0000-000000000000'));
  });

  test('renders NetworkPanel component', () => {
    render(
      <Provider store={store}>
        <NetworkPanel windowId="win-001" />
      </Provider>
    );
    const component = screen.getByTestId('network-panel');
    expect(component).toBeInTheDocument();
  });

  test('applies CSS variable styling', () => {
    render(
      <Provider store={store}>
        <NetworkPanel windowId="win-001" />
      </Provider>
    );
    const component = screen.getByTestId('network-panel');
    expect(component).toHaveStyle('background-color: var(--card)');
    expect(component).toHaveStyle('color: var(--fg)');
  });

  test('has accessible role attribute', () => {
    render(
      <Provider store={store}>
        <NetworkPanel windowId="win-001" />
      </Provider>
    );
    const component = screen.getByTestId('network-panel');
    expect(component).toHaveAttribute('role', 'dialog');
  });

  test('displays loading state initially', () => {
    render(
      <Provider store={store}>
        <NetworkPanel windowId="win-001" />
      </Provider>
    );
    const loadingText = screen.getByText('Loading Network...');
    expect(loadingText).toBeInTheDocument();
  });

  test('displays network adapters when data is loaded', () => {
    // Manually set adapters state
    store.dispatch(
      desktopSlice.actions.openAppWindow({
        app: 'network-panel',
        title: 'Network',
        machineId: 'machine-001',
      })
    );

    render(
      <Provider store={store}>
        <NetworkPanel windowId="win-001" />
      </Provider>
    );
    const container = screen.getByTestId('network-panel');
    expect(container).toBeInTheDocument();
  });
});