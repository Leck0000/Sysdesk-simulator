import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { desktopSlice } from '../../features/desktop/slice';
import { Terminal } from './Terminal';

vi.mock('xterm', () => {
  const Terminal = vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    write: vi.fn(),
    destroy: vi.fn(),
    attach: vi.fn(),
    registerAddon: vi.fn(),
    isDisposed: false,
  }));
  const FitAddon = vi.fn().mockImplementation(() => ({
    resize: vi.fn(),
  }));
  const WebLinksAddon = vi.fn().mockImplementation(() => ({
    handleDOM: vi.fn(),
  }));
  return { Terminal, FitAddon, WebLinksAddon };
});

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn(),
}));

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn(),
}));

const makeStore = () => configureStore({
  reducer: {
    desktop: desktopSlice.reducer,
  },
});

describe('Terminal Component', () => {
  beforeEach(() => {
    const store = makeStore();
    store.dispatch(desktopSlice.actions.addWindow({
      title: 'Test Terminal',
      innerWidth: 800,
      innerHeight: 600,
      x: 0,
      y: 0,
      state: 'normal',
      resizable: true,
      draggable: true,
    }));
  });

  it('renders a terminal container', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Terminal />
      </Provider>
    );
    const terminalDiv = container.querySelector('[data-testid="terminal"]');
    expect(terminalDiv).toBeInTheDocument();
  });

  it('applies CSS variable styling', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Terminal />
      </Provider>
    );
    const terminalDiv = container.querySelector('[data-testid="terminal"]') as HTMLElement;
    expect(terminalDiv).toBeInTheDocument();
    // Check CSS variables are applied via inline style
    expect(terminalDiv.style.backgroundColor).toBe('var(--bg)');
    expect(terminalDiv.style.color).toBe('var(--fg)');
  });

  it('has accessible role attribute', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Terminal />
      </Provider>
    );
    const terminalDiv = container.querySelector('[data-testid="terminal"]') as HTMLElement;
    expect(terminalDiv).toHaveAttribute('role', 'dialog');
  });
});
