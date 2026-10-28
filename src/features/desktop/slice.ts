/**
 * desktop slice — window manager state mirroring ARCHITECTURE.md data models
 *
 * Consumes: (none — produces standalone desktop state)
 * Produces: desktopSlice with windows[], zOrder[], activeWindowId
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors
 * Accessibility: WCAG 2.1 AA
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schemas for boundary validation (no `any` at boundaries)
// ---------------------------------------------------------------------------

const WindowSchema = z.object({
  title: z.string(),
  innerWidth: z.number().int().min(100),
  innerHeight: z.number().int().min(100),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  state: z.enum(['normal', 'minimized', 'maximized']),
  resizable: z.boolean().default(true),
  draggable: z.boolean().default(true),
  minimized: z.boolean().default(false),
  maximized: z.boolean().default(false),
});

type Window = z.infer<typeof WindowSchema>;

const ZOrderSchema = z.object({
  windowId: z.string().uuid(),
  zIndex: z.number().int().min(0),
});

type ZOrder = z.infer<typeof ZOrderSchema>;

const activeWindowIdSchema = z.string().uuid().optional();

type ActiveWindowId = z.infer<typeof activeWindowIdSchema> | undefined;

// ---------------------------------------------------------------------------
// Types matching ARCHITECTURE.md data model patterns
// ---------------------------------------------------------------------------

export interface DesktopState {
  // Window list
  windows: Window[];
  // Z-order index (higher zIndex = rendered on top)
  zOrder: ZOrder[];
  // Currently active window ID
  activeWindowId: ActiveWindowId;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: DesktopState = {
  windows: [],
  zOrder: [],
  activeWindowId: undefined,
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const desktopSlice = createSlice({
  name: 'desktop',
  initialState,
  reducers: {
    /** Add a new window to the desktop */
    addWindow: (state, action: PayloadAction<Omit<Window, 'id'>>) => {
      const newWindow = {
        id: crypto.randomUUID(),
        title: action.payload.title,
        innerWidth: action.payload.innerWidth,
        innerHeight: action.payload.innerHeight,
        x: action.payload.x ?? 0,
        y: action.payload.y ?? 0,
        state: action.payload.state ?? 'normal',
        resizable: action.payload.resizable ?? true,
        draggable: action.payload.draggable ?? true,
        minimized: action.payload.minimized ?? false,
        maximized: action.payload.maximized ?? false,
      };
      state.windows.push(newWindow);
      // Add to zOrder if not already present
      if (!state.zOrder.some((z) => z.windowId === newWindow.id)) {
        state.zOrder.push({ windowId: newWindow.id, zIndex: state.zOrder.length });
      }
    },

    /** Remove a window from the desktop */
    removeWindow: (state, action: PayloadAction<string>) => {
      state.windows = state.windows.filter((w) => w.id !== action.payload);
      state.zOrder = state.zOrder.filter((z) => z.windowId !== action.payload);
      if (state.activeWindowId === action.payload) {
        state.activeWindowId = undefined;
      }
    },

    /** Update a window's properties */
    updateWindow: (
      state,
      action: PayloadAction<{ window: Partial<Window>; id: string; zIndex?: number }>
    ) => {
      const { window, id, zIndex } = action.payload;
      const idx = state.windows.findIndex((w) => w.id === id);
      if (idx !== -1) {
        state.windows[idx] = { ...state.windows[idx], ...window } as Window;
      }
      // Update zIndex if provided
      if (zIndex !== undefined) {
        const zIdx = state.zOrder.findIndex((z) => z.windowId === id);
        if (zIdx !== -1) {
          state.zOrder[zIdx].zIndex = zIndex;
        } else {
          state.zOrder.push({ windowId: id, zIndex });
        }
      }
    },

    /** Set window zOrder (bring to front / send to back) */
    setZOrder: (
      state,
      action: PayloadAction<{ windowId: string; zIndex?: number }>
    ) => {
      const { windowId, zIndex } = action.payload;
      const windowZIndexEntry = state.zOrder.find((z) => z.windowId === windowId);

      if (zIndex !== undefined) {
        if (windowZIndexEntry) {
          windowZIndexEntry.zIndex = zIndex;
        } else {
          state.zOrder.push({ windowId, zIndex });
        }
      } else {
        // Bring to front: assign the highest zIndex
        if (windowZIndexEntry) {
          windowZIndexEntry.zIndex = state.zOrder.length;
        } else {
          state.zOrder.push({ windowId, zIndex: state.zOrder.length });
        }
      }
    },

    /** Activate a window (set as active) */
    activateWindow: (state, action: PayloadAction<string>) => {
      state.activeWindowId = action.payload;
    },

    /** Minimize a window */
    minimizeWindow: (state, action: PayloadAction<string>) => {
      const window = state.windows.find((w) => w.id === action.payload);
      if (window) {
        window.minimized = true;
        window.maximized = false;
        window.state = 'minimized';
      }
    },

    /** Maximize a window */
    maximizeWindow: (state, action: PayloadAction<string>) => {
      const window = state.windows.find((w) => w.id === action.payload);
      if (window) {
        window.maximized = true;
        window.minimized = false;
        window.state = 'maximized';
      }
    },

    /** Restore a window from minimized/maximized state */
    restoreWindow: (state, action: PayloadAction<string>) => {
      const window = state.windows.find((w) => w.id === action.payload);
      if (window) {
        window.minimized = false;
        window.maximized = false;
        window.state = 'normal';
      }
    },

    /** Toggle window between normal and maximized */
    toggleWindowState: (state, action: PayloadAction<string>) => {
      const window = state.windows.find((w) => w.id === action.payload);
      if (window) {
        if (window.state === 'maximized') {
          window.state = 'normal';
          window.maximized = false;
        } else {
          window.state = 'maximized';
          window.maximized = true;
        }
      }
    },

    /** Set window dimensions and position */
    setWindowBounds: (
      state,
      action: PayloadAction<{ x: number; y: number; width: number; height: number } & { windowId: string }>
    ) => {
      const { x, y, width, height, windowId } = action.payload;
      const window = state.windows.find((w) => w.id === windowId);
      if (window) {
        window.x = x;
        window.y = y;
        window.innerWidth = width;
        window.innerHeight = height;
      }
    },

    /** Close a window */
    closeWindow: (state, action: PayloadAction<string>) => {
      state.windows = state.windows.filter((w) => w.id !== action.payload);
      state.zOrder = state.zOrder.filter((z) => z.windowId !== action.payload);
      if (state.activeWindowId === action.payload) {
        state.activeWindowId = undefined;
      }
    },
  },
});

// ---------------------------------------------------------------------------
// Action exports
// ---------------------------------------------------------------------------

export const {
  addWindow,
  removeWindow,
  updateWindow,
  setZOrder,
  activateWindow,
  minimizeWindow,
  maximizeWindow,
  restoreWindow,
  toggleWindowState,
  setWindowBounds,
  closeWindow,
} = desktopSlice.actions;

export default desktopSlice.reducer;