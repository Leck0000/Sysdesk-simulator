/**
 * Window tests — base window chrome with titlebar, drag, resize,
 * minimize, maximize, close.
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors
 * Accessibility: WCAG 2.1 AA
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { desktopSlice } from '../../features/desktop/slice';
import { Window } from '../../features/desktop/WindowManager';

const makeStore = () => configureStore({
  reducer: {
    desktop: desktopSlice.reducer,
  },
});

describe('Window component', () => {
  const window = {
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

  beforeEach(() => {
    // No crypto mock needed - window objects are pre-built
  });

  it('renders titlebar with window title', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={window}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const titlebar = container.querySelector('[data-testid="window-titlebar"]');
    expect(titlebar).toBeInTheDocument();
    expect(titlebar?.textContent).toContain('Test Window');
  });

  it('renders window title in title span', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={window}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const title = container.querySelector('[data-testid="window-title"]');
    expect(title).toBeInTheDocument();
    expect(title?.textContent).toBe('Test Window');
  });

  it('renders minimize button when window can be minimized', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={window}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const minimizeBtn = container.querySelector('[data-testid="window-minimize"]');
    expect(minimizeBtn).toBeInTheDocument();
  });

  it('renders maximize button when window can be maximized', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={window}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const maximizeBtn = container.querySelector('[data-testid="window-maximize"]');
    expect(maximizeBtn).toBeInTheDocument();
  });

  it('renders close button', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={window}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const closeBtn = container.querySelector('[data-testid="window-close"]');
    expect(closeBtn).toBeInTheDocument();
  });

  it('applies theming via CSS variables', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={window}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const titlebar = container.querySelector('[data-testid="window-titlebar"]');
    expect(titlebar).toBeInTheDocument();
    const style = titlebar?.getAttribute('style') || '';
    expect(style).toContain('var(--accent)');
    expect(style).toContain('var(--bg)');
  });

  it('applies card styling via CSS variables', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={window}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const windowDiv = container.querySelector('[data-testid="window-test-window-1"]');
    expect(windowDiv).toBeInTheDocument();
    const style = windowDiv?.getAttribute('style') || '';
    expect(style).toContain('var(--card)');
    expect(style).toContain('var(--border)');
    expect(style).toContain('var(--fg)');
  });

  it('renders title drag handle when window can be dragged', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={window}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const dragHandle = container.querySelector('[data-testid="title-drag-handle"]');
    expect(dragHandle).toBeInTheDocument();
  });

  it('shows resize handle when window can be resized', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={window}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const resizeHandle = container.querySelector('[data-testid="resize-se"]');
    expect(resizeHandle).toBeInTheDocument();
  });

  it('hides resize handle when window is minimized', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={{ ...window, minimized: true, state: 'minimized' }}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const resizeHandle = container.querySelector('[data-testid="resize-se"]');
    expect(resizeHandle).not.toBeInTheDocument();
  });

  it('hides resize handle when window is maximized', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={{ ...window, maximized: true, state: 'maximized' }}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const resizeHandle = container.querySelector('[data-testid="resize-se"]');
    expect(resizeHandle).not.toBeInTheDocument();
  });

  it('renders correct positioning and sizing', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={window}
          active={true}
          activeWindowId={window.id}
          zOrder={[{ windowId: window.id, zIndex: 1 }]}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const windowDiv = container.querySelector('[data-testid="window-test-window-1"]');
    expect(windowDiv).toBeInTheDocument();
    const style = windowDiv?.getAttribute('style') || '';
    expect(style).toContain('left: 100px');
    expect(style).toContain('top: 50px');
    expect(style).toContain('width: 400px');
    expect(style).toContain('height: 300px');
  });

  it('applies effective dimensions when maximized', () => {
    const maximizedWindow = { ...window, maximized: true, innerWidth: 800, innerHeight: 600 };
    const { container } = render(
      <Provider store={makeStore()}>
        <Window
          window={maximizedWindow}
          active={true}
          activeWindowId={maximizedWindow.id}
          onMinimize={() => {}}
          onMaximize={() => {}}
          onClose={() => {}}
          onResize={() => {}}
          onDrag={() => {}}
        />
      </Provider>
    );
    const windowDiv = container.querySelector('[data-testid="window-test-window-1"]');
    expect(windowDiv).toBeInTheDocument();
    const style = windowDiv?.getAttribute('style') || '';
    expect(style).toContain('width: 800px');
    expect(style).toContain('height: 600px');
  });
});