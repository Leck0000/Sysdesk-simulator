import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { desktopSlice } from './slice';
import { TerminalWindow } from './TerminalWindow';

// Mock the ws module that TerminalWindow source imports (same relative path pattern)
vi.mock('../../shared/ws', () => ({
  wsSend: vi.fn(),
  createSendCommand: vi.fn().mockReturnValue({ machineId: 'test-machine', command: 'test' }),
  ClientEventType: {
    SEND_COMMAND: 'send_command',
    COMMAND_OUTPUT: 'command_output',
    AUTHENTICATE: 'authenticate',
    REQUEST_MACHINE_STATE: 'request_machine_state',
    ADD_TICKET_MESSAGE: 'add_ticket_message',
    CLAIM_TICKET: 'claim_ticket',
  },
  isClientEventType: vi.fn().mockReturnValue(true),
}));

// Mock xterm and addons
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

describe('TerminalWindow Component', () => {
  beforeEach(() => {
    const store = makeStore();
    store.dispatch(desktopSlice.actions.addWindow({
      title: 'Test Terminal Window',
      innerWidth: 800,
      innerHeight: 600,
      x: 0,
      y: 0,
      state: 'normal',
      resizable: true,
      draggable: true,
    }));
  });

  it('renders a terminal window with chrome', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <TerminalWindow windowId="test-window-1" />
      </Provider>
    );
    const windowDiv = container.querySelector('[data-testid="terminal-window"]');
    expect(windowDiv).toBeInTheDocument();
    expect(windowDiv).toHaveTextContent('test-window-1');
  });

  it('renders the embedded Terminal component', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <TerminalWindow windowId="test-window-1" />
      </Provider>
    );
    const terminalDiv = container.querySelector('[data-testid="terminal"]');
    expect(terminalDiv).toBeInTheDocument();
  });

  it('applies CSS variable theming to window', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <TerminalWindow windowId="test-window-1" />
      </Provider>
    );
    const windowDiv = container.querySelector('[data-testid="terminal-window"]') as HTMLElement;
    expect(windowDiv).toBeInTheDocument();
    expect(windowDiv.style.backgroundColor).toBe('var(--card)');
    expect(windowDiv.style.color).toBe('var(--fg)');
    expect(windowDiv.style.border).toBe('1px solid var(--border)');
  });

  it('has accessible role attribute on window', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <TerminalWindow windowId="test-window-1" />
      </Provider>
    );
    const windowDiv = container.querySelector('[data-testid="terminal-window"]') as HTMLElement;
    expect(windowDiv).toHaveAttribute('role', 'dialog');
  });

  it('terminal has accessible role attribute', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <TerminalWindow windowId="test-window-1" />
      </Provider>
    );
    const terminalDiv = container.querySelector('[data-testid="terminal"]') as HTMLElement;
    expect(terminalDiv).toHaveAttribute('role', 'dialog');
    expect(terminalDiv).toHaveAttribute('aria-modal', 'true');
  });
});
