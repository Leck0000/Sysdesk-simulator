/**
 * DesktopWindowFrame / WindowManager tests — chrome, theming, controls,
 * drag and resize persisting to the desktop slice.
 */
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
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

function renderFrame(overrides: Partial<DesktopWindow> = {}, store: TestStore = makeStore()) {
  const utils = render(
    <Provider store={store}>
      <DesktopWindowFrame desktopWindow={{ ...base, ...overrides }} zIndex={1} active>
        <p>content</p>
      </DesktopWindowFrame>
    </Provider>
  );
  const frame = () => utils.container.querySelector<HTMLElement>('[data-testid="window-test-window-1"]');
  return { ...utils, frame, store };
}

describe('DesktopWindowFrame', () => {
  it('renders the titlebar with the window title and children', () => {
    const { container } = renderFrame();
    expect(container.querySelector('[data-testid="window-titlebar"]')?.textContent).toContain('Test Window');
    expect(container.querySelector('[data-testid="window-title"]')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('renders minimize, maximize and close controls with accessible names', () => {
    renderFrame();
    expect(screen.getByRole('button', { name: 'Minimize window' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Maximize window' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close window' })).toBeInTheDocument();
  });

  it('themes via CSS variables only', () => {
    const { container, frame } = renderFrame();
    const titleStyle = container.querySelector('[data-testid="window-titlebar"]')?.getAttribute('style') ?? '';
    expect(titleStyle).toContain('var(--accent)');
    expect(titleStyle).toContain('var(--bg)');
    const frameStyle = frame()?.getAttribute('style') ?? '';
    expect(frameStyle).toContain('var(--card)');
    expect(frameStyle).toContain('var(--fg)');
  });

  it('positions and sizes from the window bounds', () => {
    const style = renderFrame().frame()?.getAttribute('style') ?? '';
    expect(style).toContain('left: 100px');
    expect(style).toContain('top: 50px');
    expect(style).toContain('width: 400px');
    expect(style).toContain('height: 300px');
  });

  it('fills the desktop and hides drag/resize handles when maximized', () => {
    const { container, frame } = renderFrame({ maximized: true, state: 'maximized' });
    const style = frame()?.getAttribute('style') ?? '';
    expect(style).toContain('width: 100%');
    expect(style).toContain('height: 100%');
    expect(container.querySelector('[data-testid="resize-se"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="title-drag-handle"]')).not.toBeInTheDocument();
  });

  it('renders nothing while minimized', () => {
    expect(renderFrame({ minimized: true, state: 'minimized' }).frame()).toBeNull();
  });

  it('shows drag and resize handles for a normal window', () => {
    const { container } = renderFrame();
    expect(container.querySelector('[data-testid="title-drag-handle"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="resize-se"]')).toBeInTheDocument();
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
