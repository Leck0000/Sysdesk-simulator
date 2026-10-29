/**
 * WindowManager — DnD container and z-index management for windows
 *
 * Produces: WindowManager component that manages window z-order,
 *           drag-and-drop resizing, and drop positioning.
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors
 * Accessibility: WCAG 2.1 AA
 * Responsive: >=1280px desktop-first; sidebar collapses to drawer <1024px
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { z } from 'zod';
import type { RootState } from '../../app/store';
import {
  addWindow,
  closeWindow,
  maximizeWindow,
  minimizeWindow,
  setWindowBounds,
  setZOrder,
  toggleWindowState,
  updateWindow,
} from './slice';
import type { Window } from './slice';

// ---------------------------------------------------------------------------
// Window position/size validation schema (boundary zod parser)
// ---------------------------------------------------------------------------

const windowPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().min(100),
  height: z.number().int().min(100),
});

type WindowPosition = z.infer<typeof windowPositionSchema>;

// ---------------------------------------------------------------------------
// Window drag state tracking
// ---------------------------------------------------------------------------

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
}

// ---------------------------------------------------------------------------
// Window resize state tracking
// ---------------------------------------------------------------------------

interface ResizeState {
  isResizing: boolean;
  direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

// ---------------------------------------------------------------------------
// WindowManager component
// ---------------------------------------------------------------------------

const WindowManager: React.FC = () => {
  const dispatch = useDispatch();
  const { windows, zOrder, activeWindowId } = useSelector(
    (state: RootState) => state.desktop
  );

  // Keyboard accessibility: focus management
  useEffect(() => {
    if (activeWindowId) {
      const activeWindow = document.querySelector(
        `.window[data-window-id="${activeWindowId}"]`
      );
      if (activeWindow) {
        activeWindow.setAttribute('aria-focused', 'true');
        activeWindow.focus();
      }
    }
  }, [activeWindowId]);

  // Cleanup focus attributes on unmount
  useEffect(() => {
    return () => {
      const active = document.querySelector('.window[aria-focused="true"]');
      if (active) {
        active.removeAttribute('aria-focused');
      }
    };
  }, []);

  // Handle window keydown for accessibility (Esc key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const activeEl = document.activeElement as HTMLElement;
        if (activeEl.closest('.window')) {
          // Exit maximize or close confirmation handled in Window component
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render window items in z-index order
  const sortedWindows = [...windows].sort((a, b) => {
    const aZ = zOrder.find((z) => z.windowId === a.id)?.zIndex ?? 0;
    const bZ = zOrder.find((z) => z.windowId === b.id)?.zIndex ?? 0;
    return aZ - bZ;
  });

  return (
    <div
      data-testid="window-manager"
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 48px)',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gridTemplateRows: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '8px',
        padding: '8px',
      }}
    >
      {/* Window components rendered in z-order */}
      {sortedWindows.map((window) => (
        <Window
          key={window.id}
          window={window}
          active={window.id === activeWindowId}
          activeWindowId={activeWindowId}
          zOrder={zOrder}
          onMinimize={() => dispatch(minimizeWindow(window.id))}
          onMaximize={() => dispatch(maximizeWindow(window.id))}
          onClose={() => dispatch(closeWindow(window.id))}
          onResize={(windowId: string, pos: WindowPosition) =>
            dispatch(setWindowBounds({ windowId, ...pos }))
          }
          onDrag={(windowId: string, deltaX: number, deltaY: number) =>
            dispatch(
              updateWindow({
                window: { x: deltaX, y: deltaY },
                id: windowId,
              })
            )
          }
        />
      ))}

      {/* Add window button for testing/demo */}
      <button
        data-testid="add-window-btn"
        onClick={() =>
          dispatch(
            addWindow({
              title: 'New Window',
              innerWidth: 400,
              innerHeight: 300,
              x: 0,
              y: 0,
              state: 'normal' as const,
              resizable: true,
              draggable: true,
            })
          )
        }
        style={{
          gridRow: 'auto',
          justifySelf: 'end',
          margin: '4px',
          padding: '6px 12px',
          fontSize: '12px',
          background: 'var(--accent)',
          color: 'var(--bg)',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        + Add Window
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Individual Window component
// ---------------------------------------------------------------------------

interface WindowProps {
  window: Window;
  active: boolean;
  activeWindowId: string | undefined;
  zOrder: { windowId: string; zIndex: number }[];
  onMinimize: (windowId: string) => void;
  onMaximize: (windowId: string) => void;
  onClose: (windowId: string) => void;
  onResize: (windowId: string, position: WindowPosition) => void;
  onDrag: (windowId: string, deltaX: number, deltaY: number) => void;
}

/**
 * Window — Base window chrome with titlebar, drag, resize,
 *          minimize, maximize, close.
 *
 * Consumes: desktopSlice (windows[], zOrder[], activeWindowId)
 * Produces: Window component with titlebar, drag handles,
 *           resize borders, minimize/maximize/close buttons.
 */
const Window: React.FC<WindowProps> = ({
  window,
  active,
  activeWindowId,
  zOrder,
  onMinimize,
  onMaximize,
  onClose,
  onResize,
  onDrag,
}) => {
  const dispatch = useDispatch();
  const [isMinimized, setIsMinimized] = useState(window.minimized);
  const [isMaximized, setIsMaximized] = useState(window.maximized);
  const [position, setPosition] = useState<WindowPosition>({
    x: window.x,
    y: window.y,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Drag state (per-window)
  const [drag, setDrag] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
  });
  // Resize state (per-window)
  const [resize, setResize] = useState<ResizeState>({
    isResizing: false,
    direction: 'se' as const,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  // Bring window to front on mount if it's the active one
  useEffect(() => {
    if (active && activeWindowId && window.id === activeWindowId) {
      dispatch(setZOrder({ windowId: window.id, zIndex: 1000 }));
    }
  }, [active, window.id, activeWindowId]);

  // Update state when window changes in store
  useEffect(() => {
    setIsMinimized(window.minimized);
    setIsMaximized(window.maximized);
    setPosition({
      x: window.x,
      y: window.y,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, [window]);

  // Determine display state
  const displayState = isMinimized ? 'minimized' : isMaximized ? 'maximized' : 'normal';

  // Titlebar height constant
  const titleBarHeight = 28;

  // Calculate effective dimensions (account for maximize)
  const effectiveWidth = isMaximized ? window.innerWidth : position.width;
  const effectiveHeight = isMaximized ? window.innerHeight : position.height;

  // Draggable only when not maximized
  const canDrag = !isMaximized;

  // Resize able only when not minimized and not maximized
  const canResize = !isMinimized && !isMaximized;

  // Always show close button
  const alwaysShowClose = true;

  // Window control permissions
  const canMinimize = window.resizable !== false;
  const canMaximize = window.resizable !== false;

  // Minimize button handler
  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(true);
    onMinimize(window.id);
  };

  // Maximize button handler
  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMaximized(!isMaximized);
    onMaximize(window.id);
  };

  // Close button handler
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(window.id);
  };

  // Drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent, direction: 'title' | 'content') => {
      if (!canDrag) return;
      e.preventDefault();
      setDrag({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: position.x,
        startTop: position.y,
      });
    },
    [canDrag, position.x, position.y]
  );

  // Drag while moving
  const handleDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!drag.isDragging) return;
      const deltaX = e.clientX - drag.startX;
      const deltaY = e.clientY - drag.startY;
      const newX = drag.startLeft + deltaX;
      const newY = drag.startTop + deltaY;
      // Constrain within viewport (simple bounds)
      const maxX = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const maxY = typeof window !== 'undefined' ? window.innerHeight : 1080;
      setPosition({
        x: Math.max(0, Math.min(newX, maxX - effectiveWidth)),
        y: Math.max(0, Math.min(newY, maxY - effectiveHeight)),
        width: effectiveWidth,
        height: effectiveHeight,
      });
      onDrag(window.id, deltaX, deltaY);
    },
    [drag, effectiveWidth, effectiveHeight, onDrag]
  );

  // Drag end - save position to store
  const handleDragEnd = useCallback(() => {
    setDrag({ isDragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
    dispatch(
      setWindowBounds({
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        windowId: window.id,
      })
    );
  }, [position, window.id, dispatch]);

  // Resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw') => {
      if (!canResize) return;
      e.preventDefault();
      setResize({
        isResizing: true,
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: effectiveWidth,
        startHeight: effectiveHeight,
      });
    },
    [canResize, effectiveWidth, effectiveHeight]
  );

  // Resize while dragging
  const handleResize = useCallback(
    (e: React.MouseEvent) => {
      if (!resize.isResizing) return;
      const deltaX = e.clientX - resize.startX;
      const deltaY = e.clientY - resize.startY;

      let newWidth = resize.startWidth;
      let newHeight = resize.startHeight;

      // Constrain minimum size
      const minSize = 100;

      if (resize.direction.includes('e')) {
        newWidth = Math.max(minSize, resize.startWidth + deltaX);
      } else if (resize.direction.includes('w')) {
        newWidth = Math.max(minSize, resize.startWidth - deltaX);
      }

      if (resize.direction.includes('s')) {
        newHeight = Math.max(minSize, resize.startHeight + deltaY);
      } else if (resize.direction.includes('n')) {
        newHeight = Math.max(minSize, resize.startHeight - deltaY);
      }

      setPosition({
        x: position.x,
        y: position.y,
        width: newWidth,
        height: newHeight,
      });
      onResize(window.id, { x: position.x, y: position.y, width: newWidth, height: newHeight });
    },
    [position, effectiveWidth, effectiveHeight, onResize, resize]
  );

  // Resize end - save position to store
  const handleResizeEnd = useCallback(() => {
    setResize({
      isResizing: false,
      direction: 'se' as const,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
    });
    dispatch(
      setWindowBounds({
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        windowId: window.id,
      })
    );
  }, [position, window.id, dispatch]);

  // Keydown handler for accessibility (Esc key)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        // Restore from maximize if in maximized state
        if (isMaximized) {
          setIsMaximized(false);
          dispatch(toggleWindowState(window.id));
        }
      }
    },
    [isMaximized, window.id, dispatch]
  );

  return (
    <div
      data-testid={`window-${window.id}`}
      role="dialog"
      aria-modal="true"
      aria-label={window.title}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        // Z-index from zOrder
        zIndex: zOrder?.find((z) => z.windowId === window.id)?.zIndex ?? 1,
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: effectiveWidth,
        height: effectiveHeight,
        minWidth: 100,
        minHeight: 100,
        // Theming via CSS variables - no hardcoded colors
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        color: 'var(--fg)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        // Animation for state changes
        transition: 'left 0.2s, top 0.2s, width 0.2s, height 0.2s',
        // Overflow for content
        overflow: 'hidden',
      }}
    >
      {/* Titlebar */}
      <div
        data-testid="window-titlebar"
        style={{
          padding: '4px 8px',
          backgroundColor: 'var(--accent)',
          color: 'var(--bg)',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none',
          height: '24px',
          borderBottom: '1px solid var(--border)',
          cursor: canDrag ? 'move' : 'default',
        }}
        role="presentation"
      >
        <span
          data-testid="window-title"
          style={{ flexGrow: 1 }}
        >
          {window.title}
        </span>

        {/* Control buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {canMinimize && !isMinimized && (
            <button
              data-testid="window-minimize"
              style={{
                width: '24px',
                height: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--fg)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '0',
              }}
              onClick={handleMinimize}
              aria-label="Minimize window"
              title="Minimize"
            >
              –
            </button>
          )}

          {canMaximize && !isMaximized && (
            <button
              data-testid="window-maximize"
              style={{
                width: '24px',
                height: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--fg)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '0',
              }}
              onClick={handleMaximize}
              aria-label="Maximize window"
              title="Maximize"
            >
              □
            </button>
          )}

          {alwaysShowClose && (
            <button
              data-testid="window-close"
              style={{
                width: '24px',
                height: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--fg)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '0',
              }}
              onClick={handleClose}
              aria-label="Close window"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content area with resize handles */}
      <div
        data-testid="window-content"
        style={{
          padding: '8px',
          overflowY: 'auto',
          cursor: canResize ? 'grab' : 'default',
          height: `calc(${effectiveHeight}px - 28px)`,
        }}
        role="grid"
        aria-labelledby="window-title"
      >
        {/* Resize handles - only show when not maximized */}
        {canResize && (
          <div
            data-testid="resize-se"
            style={{
              position: 'absolute',
              right: '0',
              bottom: '0',
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--accent)',
              cursor: 'se-resize',
            }}
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            title="Resize southeast"
          />
        )}

        {/* Title drag handle - only show when window can be dragged */}
        {canDrag && (
          <div
            data-testid="title-drag-handle"
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              cursor: 'move',
            }}
            onMouseDown={(e) => handleDragStart(e, 'title')}
            title="Drag window"
          />
        )}
      </div>
    </div>
  );
}

export { WindowManager, Window };