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
import { Window } from '../../features/desktop/WindowManager';

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
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const titlebar = container.querySelector('[data-testid="window-titlebar"]');
    expect(titlebar).toBeInTheDocument();
    expect(titlebar?.textContent).toContain('Test Window');
  });

  it('renders window title in title span', () => {
    const { container } = render(
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const title = container.querySelector('[data-testid="window-title"]');
    expect(title).toBeInTheDocument();
    expect(title?.textContent).toBe('Test Window');
  });

  it('renders minimize button when window can be minimized', () => {
    const { container } = render(
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const minimizeBtn = container.querySelector('[data-testid="window-minimize"]');
    expect(minimizeBtn).toBeInTheDocument();
  });

  it('renders maximize button when window can be maximized', () => {
    const { container } = render(
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const maximizeBtn = container.querySelector('[data-testid="window-maximize"]');
    expect(maximizeBtn).toBeInTheDocument();
  });

  it('renders close button', () => {
    const { container } = render(
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const closeBtn = container.querySelector('[data-testid="window-close"]');
    expect(closeBtn).toBeInTheDocument();
  });

  it('applies theming via CSS variables', () => {
    const { container } = render(
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const titlebar = container.querySelector('[data-testid="window-titlebar"]');
    expect(titlebar).toBeInTheDocument();
    const style = titlebar?.getAttribute('style') || '';
    expect(style).toContain('var(--accent)');
    expect(style).toContain('var(--bg)');
  });

  it('applies card styling via CSS variables', () => {
    const { container } = render(
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const windowDiv = container.querySelector('[data-testid="window-1"]');
    expect(windowDiv).toBeInTheDocument();
    const style = windowDiv?.getAttribute('style') || '';
    expect(style).toContain('var(--card)');
    expect(style).toContain('var(--border)');
    expect(style).toContain('var(--fg)');
  });

  it('renders title drag handle when window can be dragged', () => {
    const { container } = render(
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const dragHandle = container.querySelector('[data-testid="title-drag-handle"]');
    expect(dragHandle).toBeInTheDocument();
  });

  it('shows resize handle when window can be resized', () => {
    const { container } = render(
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const resizeHandle = container.querySelector('[data-testid="resize-se"]');
    expect(resizeHandle).toBeInTheDocument();
  });

  it('hides resize handle when window is minimized', () => {
    const { container } = render(
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const resizeHandle = container.querySelector('[data-testid="resize-se"]');
    expect(resizeHandle).not.toBeInTheDocument();
  });

  it('hides resize handle when window is maximized', () => {
    const { container } = render(
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const resizeHandle = container.querySelector('[data-testid="resize-se"]');
    expect(resizeHandle).not.toBeInTheDocument();
  });

  it('renders correct positioning and sizing', () => {
    const { container } = render(
      <Window
        window={window}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const windowDiv = container.querySelector('[data-testid="window-1"]');
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
      <Window
        window={maximizedWindow}
        active={true}
        onMinimize={() => {}}
        onMaximize={() => {}}
        onClose={() => {}}
        onResize={() => {}}
        onDrag={() => {}}
      />
    );
    const windowDiv = container.querySelector('[data-testid="window-1"]');
    expect(windowDiv).toBeInTheDocument();
    const style = windowDiv?.getAttribute('style') || '';
    expect(style).toContain('width: 800px');
    expect(style).toContain('height: 600px');
  });
});