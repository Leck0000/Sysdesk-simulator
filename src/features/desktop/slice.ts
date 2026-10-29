/** desktop slice — window manager state mirroring ARCHITECTURE.md data models
* Consumes: (none — produces standalone desktop state)
* Produces: desktopSlice with windows[], zOrder[], activeWindowId
* Strict TS: no `any`; use `unknown` + zod parsers at boundaries
* CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors
* Accessibility: WCAG 2.1 AA
*/

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schemas for boundary validation (no `any` at boundaries)
// ---------------------------------------------------------------------------

export const WindowSchema = z.object({
  id: z.string().uuid(),
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
  machineId: z.string().optional(),
  app: z.string().optional(),
});

export type DesktopWindow = z.infer<typeof WindowSchema>;
/** Input shape (fields with schema defaults are optional). */
export type DesktopWindowInput = z.input<typeof WindowSchema>;

export const ZOrderSchema = z.object({
  windowId: z.string().uuid(),
  zIndex: z.number().int().min(0),
});

type ZOrder = z.infer<typeof ZOrderSchema>;

export const activeWindowIdSchema = z.string().uuid().optional();

type ActiveWindowId = z.infer<typeof activeWindowIdSchema> | undefined;

// ---------------------------------------------------------------------------
// Types matching ARCHITECTURE.md data model patterns
// ---------------------------------------------------------------------------

export enum AppType { EventViewer = 'event-viewer', ServicesPanel = 'services-panel', RegistryEditor = 'registry-editor', NetworkPanel = 'network-panel', ADUsersComputers = 'ad-users-computers', FileExplorer = 'file-explorer', Terminal = 'terminal' }

export interface DesktopState {
  // Window list
  windows: DesktopWindow[];
  // Z-order index (higher zIndex = rendered on top)
  zOrder: ZOrder[];
  // Currently active window ID
  activeWindowId: ActiveWindowId;
  // Terminal output chunks per machine (from ws command_output), newest last
  terminalOutput: Record<string, string[]>;
  // Latest value per simulated-OS subsystem (from ws state.delta)
  subsystems: Record<string, unknown>;
}

/** Max output chunks retained per machine. */
export const TERMINAL_OUTPUT_LIMIT = 500;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: DesktopState = {
  windows: [],
  zOrder: [],
  activeWindowId: undefined,
  terminalOutput: {},
  subsystems: {},
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export const desktopSlice = createSlice({
  name: 'desktop',
  initialState,
  reducers: {
    /** Add a new window to the desktop */
    addWindow: (state, action: PayloadAction<Omit<DesktopWindowInput, 'id'>>) => {
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
      action: PayloadAction<{ window: Partial<DesktopWindow>; id: string; zIndex?: number }>
    ) => {
      const { window, id, zIndex } = action.payload;
      const idx = state.windows.findIndex((w) => w.id === id);
      if (idx !== -1) {
        state.windows[idx] = { ...state.windows[idx], ...window } as DesktopWindow;
      }
      // Update zIndex if provided
      if (zIndex !== undefined) {
        const entry = state.zOrder.find((z) => z.windowId === id);
        if (entry) {
          entry.zIndex = zIndex;
        } else {
          state.zOrder.push({ windowId: id, zIndex });
        }
      }
    },

    /** Set window zOrder (bring to front / send to back) */
    setZOrder: (state, action: PayloadAction<{ windowId: string; zIndex?: number }>) => {
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

    /** Focus a window: make it active and raise it above all others */
    focusWindow: (state, action: PayloadAction<string>) => {
      const top = state.zOrder.reduce((max, z) => Math.max(max, z.zIndex), 0);
      const entry = state.zOrder.find((z) => z.windowId === action.payload);
      if (entry) {
        if (entry.zIndex < top || state.zOrder.filter((z) => z.zIndex === top).length > 1) entry.zIndex = top + 1;
      } else {
        state.zOrder.push({ windowId: action.payload, zIndex: top + 1 });
      }
      state.activeWindowId = action.payload;
    },

    /** Append command output for a machine's terminal(s) */
    appendTerminalOutput: (state, action: PayloadAction<{ machineId: string; output: string }>) => {
      const { machineId, output } = action.payload;
      const chunks = (state.terminalOutput[machineId] ??= []);
      chunks.push(output);
      if (chunks.length > TERMINAL_OUTPUT_LIMIT) chunks.splice(0, chunks.length - TERMINAL_OUTPUT_LIMIT);
    },

    /** Apply a ws state.delta: set or delete a subsystem's value */
    applyStateDelta: (state, action: PayloadAction<{ subsystem: string; op: 'set' | 'delete'; value?: unknown }>) => {
      const { subsystem, op, value } = action.payload;
      if (op === 'delete') delete state.subsystems[subsystem];
      else state.subsystems[subsystem] = value;
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
    setWindowBounds: (state, action: PayloadAction<{ x: number; y: number; width: number; height: number } & { windowId: string }>) => {
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

    /** Open a simulated Windows app window */
    openAppWindow: (state, action: PayloadAction<{ app: keyof typeof AppType; title: string; machineId: string }>) => {
      const { app, title, machineId } = action.payload;
      const newWindow = {
        id: crypto.randomUUID(),
        title,
        innerWidth: 720,
        innerHeight: 460,
        x: 80 + (state.windows.length % 8) * 32,
        y: 40 + (state.windows.length % 8) * 32,
        state: 'normal' as const,
        resizable: true,
        draggable: true,
        minimized: false,
        maximized: false,
        machineId,
        app,
      };
      state.windows.push(newWindow as DesktopWindow);
      if (!state.zOrder.some((z) => z.windowId === newWindow.id)) {
        state.zOrder.push({ windowId: newWindow.id, zIndex: state.zOrder.length });
      }
      state.activeWindowId = newWindow.id;
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
  focusWindow,
  appendTerminalOutput,
  applyStateDelta,
  minimizeWindow,
  maximizeWindow,
  restoreWindow,
  toggleWindowState,
  setWindowBounds,
  closeWindow,
  openAppWindow,
} = desktopSlice.actions;

export default desktopSlice.reducer;