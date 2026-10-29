/**
 * DesktopWindowFrame / WindowManager tests — chrome, theming, controls,
 * drag and resize persisting to the desktop slice.
 */
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import desktopReducer, { openAppWindow, type DesktopWindow } from '../../features/desktop/slice';
import { DesktopWindowFrame, WindowManager } from '../../features/desktop/WindowManager';

const makeStore = () => configureStore({ reducer: { desktop: desktopReducer } });
type TestStore = ReturnType<typeof makeStore>;

const base: DesktopWindow = {
  id: 'test-window-1',
  title: 'Test Window',
  innerWidth: 400,
  innerHeight: 300,
  x: 100,
  y: 50,
  state: 'normal',
  resizable: true,
  draggable: true,
  minimized: false,
  maximized: false,
};

function renderFrame(overrides: Partial<DesktopWindow> = {}, store: TestStore = makeStore(), active = true) {
  const utils = render(
    <Provider store={store}>
      <DesktopWindowFrame desktopWindow={{ ...base, ...overrides }} zIndex={1} active={active}>
        <p>content</p>
      </DesktopWindowFrame>
    </Provider>
  );
  const frame = () => utils.container.querySelector<HTMLElement>('[data-testid="window-test-window-1"]');
  return { ...utils, frame, store };
}

describe('DesktopWindowFrame', () => {
  it('renders titlebar with window title', () => {
    const { container } = renderFrame();
    expect(container.querySelector('[data-testid="window-titlebar"]')?.textContent).toContain('Test Window');
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('renders window title in title span', () => {
    const { container } = renderFrame();
    expect(container.querySelector('[data-testid="window-title"]')?.textContent).toBe('Test Window');
  });

  it('is a dialog named after the window title', () => {
    renderFrame();
    expect(screen.getByRole('dialog', { name: 'Test Window' })).toBeInTheDocument();
  });

  it('renders minimize button', () => {
    renderFrame();
    expect(screen.getByRole('button', { name: 'Minimize window' })).toBeInTheDocument();
  });

  it('renders maximize button (labelled Restore when maximized)', () => {
    renderFrame();
    expect(screen.getByRole('button', { name: 'Maximize window' })).toBeInTheDocument();
    cleanup();
    renderFrame({ maximized: true, state: 'maximized' });
    expect(screen.getByRole('button', { name: 'Restore window' })).toBeInTheDocument();
  });

  it('renders close button', () => {
    renderFrame();
    expect(screen.getByRole('button', { name: 'Close window' })).toBeInTheDocument();
  });

  it('applies titlebar theming via CSS variables', () => {
    const { container } = renderFrame();
    const titleStyle = container.querySelector('[data-testid="window-titlebar"]')?.getAttribute('style') ?? '';
    expect(titleStyle).toContain('var(--accent)');
    expect(titleStyle).toContain('var(--bg)');
  });

  it('applies card styling via CSS variables (--card, --fg; --border when inactive, --accent when active)', () => {
    const active = renderFrame().frame()?.getAttribute('style') ?? '';
    expect(active).toContain('var(--card)');
    expect(active).toContain('var(--fg)');
    expect(active).toContain('border: 1px solid var(--accent)');
    cleanup();
    const inactive = renderFrame({}, makeStore(), false).frame()?.getAttribute('style') ?? '';
    expect(inactive).toContain('border: 1px solid var(--border)');
  });

  it('renders title drag handle when window can be dragged', () => {
    const { container } = renderFrame();
    expect(container.querySelector('[data-testid="title-drag-handle"]')).toBeInTheDocument();
  });

  it('shows resize handle when window can be resized', () => {
    const { container } = renderFrame();
    expect(container.querySelector('[data-testid="resize-se"]')).toBeInTheDocument();
  });

  it('renders nothing (so no resize handle) while minimized', () => {
    const { container, frame } = renderFrame({ minimized: true, state: 'minimized' });
    expect(frame()).toBeNull();
    expect(container.querySelector('[data-testid="resize-se"]')).not.toBeInTheDocument();
  });

  it('hides resize and drag handles when maximized', () => {
    const { container } = renderFrame({ maximized: true, state: 'maximized' });
    expect(container.querySelector('[data-testid="resize-se"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="title-drag-handle"]')).not.toBeInTheDocument();
  });

  it('renders correct positioning and sizing', () => {
    const style = renderFrame().frame()?.getAttribute('style') ?? '';
    expect(style).toContain('left: 100px');
    expect(style).toContain('top: 50px');
    expect(style).toContain('width: 400px');
    expect(style).toContain('height: 300px');
  });

  it('fills the desktop when maximized, independent of the stored size', () => {
    const style = renderFrame({ maximized: true, state: 'maximized', innerWidth: 800, innerHeight: 600 }).frame()?.getAttribute('style') ?? '';
    expect(style).toContain('width: 100%');
    expect(style).toContain('height: 100%');
    expect(style).not.toContain('800px');
  });
});

describe('WindowManager', () => {
  const openOne = () => {
    const store = makeStore();
    store.dispatch(openAppWindow({ app: 'Terminal', title: 'Terminal — m1', machineId: 'm1' }));
    render(
      <Provider store={store}>
        <WindowManager />
      </Provider>
    );
    const win = store.getState().desktop.windows[0];
    if (!win) throw new Error('window not opened');
    return { store, win };
  };

  it('dragging the titlebar moves the window and persists bounds to the store', () => {
    const { store, win } = openOne();
    const titlebar = screen.getByTestId(`window-${win.id}`).querySelector('[data-testid="window-titlebar"]');
    if (!titlebar) throw new Error('no titlebar');
    fireEvent.pointerDown(titlebar, { button: 0, clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(titlebar, { clientX: 260, clientY: 140, pointerId: 1 });
    fireEvent.pointerUp(titlebar, { clientX: 260, clientY: 140, pointerId: 1 });
    const moved = store.getState().desktop.windows[0];
    expect(moved?.x).toBe(win.x + 60);
    expect(moved?.y).toBe(win.y + 40);
  });

  it('resizing from the SE handle persists the new size', () => {
    const { store, win } = openOne();
    const handle = screen.getByTestId('resize-se');
    fireEvent.pointerDown(handle, { button: 0, clientX: 500, clientY: 400, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 550, clientY: 430, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 550, clientY: 430, pointerId: 1 });
    const resized = store.getState().desktop.windows[0];
    expect(resized?.innerWidth).toBe(win.innerWidth + 50);
    expect(resized?.innerHeight).toBe(win.innerHeight + 30);
  });

  it('minimize moves the window to the taskbar; clicking it restores', () => {
    const { store } = openOne();
    fireEvent.click(screen.getByRole('button', { name: 'Minimize window' }));
    expect(store.getState().desktop.windows[0]?.minimized).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Terminal — m1' }));
    expect(store.getState().desktop.windows[0]?.minimized).toBe(false);
  });

  it('close removes the window', () => {
    const { store } = openOne();
    fireEvent.click(screen.getByRole('button', { name: 'Close window' }));
    expect(store.getState().desktop.windows).toHaveLength(0);
  });
});
