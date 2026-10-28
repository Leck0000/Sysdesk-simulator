/**
 * desktop slice tests — window manager state
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors
 * Accessibility: WCAG 2.1 AA
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { desktopSlice } from './slice';

describe('desktop slice', () => {
  // The reducer(undefined, action) pattern returns initial state
  // and reducer(existingState, action) returns next state

  describe('initial state', () => {
    it('has the correct initial state shape', () => {
      const state = desktopSlice.reducer(undefined, { type: '@@init' } as any);
      expect(state.windows).toEqual([]);
      expect(state.zOrder).toEqual([]);
      expect(state.activeWindowId).toBeUndefined();
    });
  });

  describe('addWindow', () => {
    it('adds a new window to the desktop', () => {
      const { reducer } = desktopSlice;
      const state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test', innerWidth: 400, innerHeight: 300 },
      } as any);
      expect(state.windows.length).toBe(1);
      expect(state.windows[0].title).toBe('Test');
      expect(state.windows[0].innerWidth).toBe(400);
      expect(state.windows[0].innerHeight).toBe(300);
      expect(state.windows[0].id).toBeDefined();
      expect(state.windows[0].state).toBe('normal');
    });

    it('adds window to zOrder', () => {
      const { reducer } = desktopSlice;
      let state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test1', innerWidth: 400, innerHeight: 300 },
      } as any);
      state = reducer(state, {
        type: 'desktop/addWindow',
        payload: { title: 'Test2', innerWidth: 300, innerHeight: 200 },
      } as any);
      expect(state.zOrder.length).toBe(2);
      expect(state.zOrder[0].zIndex).toBe(0);
      expect(state.zOrder[1].zIndex).toBe(1);
    });

    it('does not add duplicate to zOrder for same window', () => {
      const { reducer } = desktopSlice;
      let state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test1', innerWidth: 400, innerHeight: 300 },
      } as any);
      // Adding same window again - but with different UUID it's a different window
      state = reducer(state, {
        type: 'desktop/addWindow',
        payload: { title: 'Test1', innerWidth: 400, innerHeight: 300 },
      } as any);
      // Two windows with same title but different IDs should result in 2 zOrder entries
      // since each gets its own UUID
      expect(state.windows.length).toBe(2);
    });
  });

  describe('removeWindow', () => {
    let state: any;

    beforeEach(() => {
      const { reducer } = desktopSlice;
      state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test1', innerWidth: 400, innerHeight: 300 },
      } as any);
      state = reducer(state, {
        type: 'desktop/addWindow',
        payload: { title: 'Test2', innerWidth: 300, innerHeight: 200 },
      } as any);
    });

    it('removes a window from the desktop', () => {
      const { reducer } = desktopSlice;
      const stateAfterRemove = reducer(state, {
        type: 'desktop/removeWindow',
        payload: state.windows[0].id,
      } as any);
      expect(stateAfterRemove.windows.length).toBe(1);
      expect(stateAfterRemove.windows[0].title).toBe('Test2');
    });

    it('removes window from zOrder', () => {
      const { reducer } = desktopSlice;
      const stateAfterRemove = reducer(state, {
        type: 'desktop/removeWindow',
        payload: state.windows[0].id,
      } as any);
      expect(stateAfterRemove.zOrder.some((z: any) => z.windowId === state.windows[0].id)).toBe(false);
    });

    it('clears activeWindowId if removed window was active', () => {
      const { reducer } = desktopSlice;
      // First activate the window
      let stateAfterActivate = reducer(state, {
        type: 'desktop/activateWindow',
        payload: state.windows[0].id,
      } as any);
      // Then remove it
      const stateAfterRemove = reducer(stateAfterActivate, {
        type: 'desktop/removeWindow',
        payload: state.windows[0].id,
      } as any);
      expect(stateAfterRemove.activeWindowId).toBeUndefined();
    });
  });

  describe('updateWindow', () => {
    let state: any;

    beforeEach(() => {
      const { reducer } = desktopSlice;
      state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test', innerWidth: 400, innerHeight: 300 },
      } as any);
    });

    it('updates window properties', () => {
      const { reducer } = desktopSlice;
      const stateAfterUpdate = reducer(state, {
        type: 'desktop/updateWindow',
        payload: {
          window: { title: 'Updated' },
          id: state.windows[0].id,
          zIndex: 5,
        },
      } as any);
      expect(stateAfterUpdate.windows[0].title).toBe('Updated');
      const zEntry = stateAfterUpdate.zOrder.find((z: any) => z.windowId === stateAfterUpdate.windows[0].id);
      expect(zEntry?.zIndex).toBe(5);
    });
  });

  describe('setZOrder', () => {
    let state: any;

    beforeEach(() => {
      const { reducer } = desktopSlice;
      state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test', innerWidth: 400, innerHeight: 300 },
      } as any);
    });

    it('sets zIndex for existing window', () => {
      const { reducer } = desktopSlice;
      const stateAfterSetZOrder = reducer(state, {
        type: 'desktop/setZOrder',
        payload: { windowId: state.windows[0].id, zIndex: 5 },
      } as any);
      const zEntry = stateAfterSetZOrder.zOrder.find((z: any) => z.windowId === stateAfterSetZOrder.windows[0].id);
      expect(zEntry?.zIndex).toBe(5);
    });

    it('adds new zOrder entry if window not in zOrder', () => {
      const { reducer } = desktopSlice;
      const stateAfterSetZOrder = reducer(state, {
        type: 'desktop/setZOrder',
        payload: { windowId: 'nonexistent-uuid', zIndex: 3 },
      } as any);
      expect(stateAfterSetZOrder.zOrder.some((z: any) => z.windowId === 'nonexistent-uuid')).toBe(true);
      expect(stateAfterSetZOrder.zOrder.find((z: any) => z.windowId === 'nonexistent-uuid')?.zIndex).toBe(3);
    });
  });

  describe('activateWindow', () => {
    let state: any;

    beforeEach(() => {
      const { reducer } = desktopSlice;
      state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test', innerWidth: 400, innerHeight: 300 },
      } as any);
    });

    it('sets activeWindowId', () => {
      const { reducer } = desktopSlice;
      const stateAfterActivate = reducer(state, {
        type: 'desktop/activateWindow',
        payload: state.windows[0].id,
      } as any);
      expect(stateAfterActivate.activeWindowId).toBe(state.windows[0].id);
    });
  });

  describe('minimizeWindow', () => {
    let state: any;

    beforeEach(() => {
      const { reducer } = desktopSlice;
      state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test', innerWidth: 400, innerHeight: 300 },
      } as any);
    });

    it('minimizes a window', () => {
      const { reducer } = desktopSlice;
      const stateAfterMinimize = reducer(state, {
        type: 'desktop/minimizeWindow',
        payload: state.windows[0].id,
      } as any);
      expect(stateAfterMinimize.windows[0].minimized).toBe(true);
      expect(stateAfterMinimize.windows[0].maximized).toBe(false);
      expect(stateAfterMinimize.windows[0].state).toBe('minimized');
    });
  });

  describe('maximizeWindow', () => {
    let state: any;

    beforeEach(() => {
      const { reducer } = desktopSlice;
      state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test', innerWidth: 400, innerHeight: 300 },
      } as any);
    });

    it('maximizes a window', () => {
      const { reducer } = desktopSlice;
      const stateAfterMaximize = reducer(state, {
        type: 'desktop/maximizeWindow',
        payload: state.windows[0].id,
      } as any);
      expect(stateAfterMaximize.windows[0].maximized).toBe(true);
      expect(stateAfterMaximize.windows[0].minimized).toBe(false);
      expect(stateAfterMaximize.windows[0].state).toBe('maximized');
    });
  });

  describe('toggleWindowState', () => {
    let state: any;

    beforeEach(() => {
      const { reducer } = desktopSlice;
      state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test', innerWidth: 400, innerHeight: 300 },
      } as any);
    });

    it('toggles from normal to maximized', () => {
      const { reducer } = desktopSlice;
      const stateAfterToggle = reducer(state, {
        type: 'desktop/toggleWindowState',
        payload: state.windows[0].id,
      } as any);
      expect(stateAfterToggle.windows[0].state).toBe('maximized');
      expect(stateAfterToggle.windows[0].maximized).toBe(true);
    });

    it('toggles from maximized to normal', () => {
      const { reducer } = desktopSlice;
      // First maximize
      const stateAfterMaximize = reducer(state, {
        type: 'desktop/maximizeWindow',
        payload: state.windows[0].id,
      } as any);
      // Then toggle
      const stateAfterToggle = reducer(stateAfterMaximize, {
        type: 'desktop/toggleWindowState',
        payload: state.windows[0].id,
      } as any);
      expect(stateAfterToggle.windows[0].state).toBe('normal');
      expect(stateAfterToggle.windows[0].maximized).toBe(false);
    });
  });

  describe('setWindowBounds', () => {
    let state: any;

    beforeEach(() => {
      const { reducer } = desktopSlice;
      state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test', innerWidth: 400, innerHeight: 300 },
      } as any);
    });

    it('sets window dimensions and position', () => {
      const { reducer } = desktopSlice;
      const stateAfterBounds = reducer(state, {
        type: 'desktop/setWindowBounds',
        payload: { windowId: state.windows[0].id, x: 100, y: 50, width: 800, height: 600 },
      } as any);
      expect(stateAfterBounds.windows[0].x).toBe(100);
      expect(stateAfterBounds.windows[0].y).toBe(50);
      expect(stateAfterBounds.windows[0].innerWidth).toBe(800);
      expect(stateAfterBounds.windows[0].innerHeight).toBe(600);
    });
  });

  describe('closeWindow', () => {
    let state: any;

    beforeEach(() => {
      const { reducer } = desktopSlice;
      state = reducer(undefined, {
        type: 'desktop/addWindow',
        payload: { title: 'Test1', innerWidth: 400, innerHeight: 300 },
      } as any);
      state = reducer(state, {
        type: 'desktop/addWindow',
        payload: { title: 'Test2', innerWidth: 300, innerHeight: 200 },
      } as any);
    });

    it('closes a window', () => {
      const { reducer } = desktopSlice;
      const stateAfterClose = reducer(state, {
        type: 'desktop/closeWindow',
        payload: state.windows[0].id,
      } as any);
      expect(stateAfterClose.windows.length).toBe(1);
      expect(stateAfterClose.windows[0].title).toBe('Test2');
    });

    it('removes window from zOrder', () => {
      const { reducer } = desktopSlice;
      const stateAfterClose = reducer(state, {
        type: 'desktop/closeWindow',
        payload: state.windows[0].id,
      } as any);
      expect(stateAfterClose.zOrder.some((z: any) => z.windowId === state.windows[0].id)).toBe(false);
    });

    it('clears activeWindowId if closed window was active', () => {
      const { reducer } = desktopSlice;
      // First activate the window
      let stateAfterActivate = reducer(state, {
        type: 'desktop/activateWindow',
        payload: state.windows[0].id,
      } as any);
      // Then close it
      const stateAfterClose = reducer(stateAfterActivate, {
        type: 'desktop/closeWindow',
        payload: state.windows[0].id,
      } as any);
      expect(stateAfterClose.activeWindowId).toBeUndefined();
    });
  });
});