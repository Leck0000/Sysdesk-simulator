/**
 * Window — Base window chrome with titlebar, drag, resize,
 *          minimize, maximize, close.
 *
 * Consumes: desktopSlice (windows[], zOrder[], activeWindowId)
 * Produces: Window component with titlebar, drag handles,
 *           resize borders, minimize/maximize/close buttons.
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors
 * Accessibility: WCAG 2.1 AA
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { z } from 'zod';
import { desktopSlice } from '../../features/desktop/slice';
import type { RootState } from '../../app/store';

const windowPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  width: z.number().int().min(100),
  height: z.number().int().min(100),
});

type WindowPosition = z.infer<typeof windowPositionSchema>;

interface WindowProps {
  window: import('../features/desktop/slice').Window;
  active: boolean;
  onMinimize: (windowId: string) => void;
  onMaximize: (windowId: string) => void;
  onClose: (windowId: string) => void;
  onResize: (windowId: string, position: WindowPosition) => void;
  onDrag: (windowId: string, deltaX: number, deltaY: number) => void;
}

const Window: React.FC<WindowProps> = ({
  window,
  active,
  onMinimize,
  onMaximize,
  onClose,
  onResize,
  onDrag,
}) => {
  const { desktop } = useSelector((state: RootState) => state);
  const activeWindowId = desktop.activeWindowId;

  const [isMinimized, setIsMinimized] = useState(window.minimized);
  const [isMaximized, setIsMaximized] = useState(window.maximized);
  const [position, setPosition] = useState<WindowPosition>({
    x: window.x,
    y: window.y,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Bring window to front on mount if it's the active one
  useEffect(() => {
    if (active && activeWindowId && window.id === activeWindowId) {
      // Access dispatch via the store - will be available in full app
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

  const displayState = isMinimized ? 'minimized' : isMaximized ? 'maximized' : 'normal';
  const titleBarHeight = 28;
  const effectiveWidth = isMaximized ? window.innerWidth : position.width;
  const effectiveHeight = isMaximized ? window.innerHeight : position.height;
  const canDrag = !isMaximized;
  const canResize = !isMinimized && !isMaximized;
  const alwaysShowClose = true;

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(true);
    onMinimize(window.id);
  };

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMaximized(!isMaximized);
    onMaximize(window.id);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(window.id);
  };

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

  const handleDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!drag.isDragging) return;
      const deltaX = e.clientX - drag.startX;
      const deltaY = e.clientY - drag.startY;
      const newX = drag.startLeft + deltaX;
      const newY = drag.startTop + deltaY;
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
    [drag, effectiveWidth, effectiveHeight, maxX, maxY, onDrag]
  );

  const handleDragEnd = useCallback(() => {
    setDrag({ isDragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  }, [dispatch]);

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

  const handleResize = useCallback(
    (e: React.MouseEvent) => {
      if (!resize.isResizing) return;
      const deltaX = e.clientX - resize.startX;
      const deltaY = e.clientY - resize.startY;
      let newWidth = resize.startWidth;
      let newHeight = resize.startHeight;
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

  const handleResizeEnd = useCallback(() => {
    setResize({
      isResizing: false,
      direction: 'se' as const,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
    });
  }, [dispatch]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (isMaximized) {
          setIsMaximized(false);
        }
      }
    },
    [isMaximized]
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
        zIndex: 1,
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: effectiveWidth,
        height: effectiveHeight,
        minWidth: 100,
        minHeight: 100,
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        color: 'var(--fg)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'left 0.2s, top 0.2s, width 0.2s, height 0.2s',
        overflow: 'hidden',
      }}
    >
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
        <div style={{ display: 'flex', gap: '4px' }}>
          {canMinimize && !isMinimized && (
            <button
              data-testid="window-minimize"
              style={{ width: '24px', height: '20px', background: 'transparent', border: 'none', color: 'var(--fg)', fontSize: '12px', cursor: 'pointer', padding: '0' }}
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
              style={{ width: '24px', height: '20px', background: 'transparent', border: 'none', color: 'var(--fg)', fontSize: '12px', cursor: 'pointer', padding: '0' }}
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
              style={{ width: '24px', height: '20px', background: 'transparent', border: 'none', color: 'var(--fg)', fontSize: '12px', cursor: 'pointer', padding: '0' }}
              onClick={handleClose}
              aria-label="Close window"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>
      </div>
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
};

export { Window };