/**
 * desktop slice tests — window manager state (typed action creators, no casts)
 */
import { describe, it, expect } from 'vitest';
import reducer, {
  addWindow,
  removeWindow,
  updateWindow,
  setZOrder,
  activateWindow,
  focusWindow,
  minimizeWindow,
  maximizeWindow,
  toggleWindowState,
  setWindowBounds,
  closeWindow,
  openAppWindow,
  appendTerminalOutput,
  TERMINAL_OUTPUT_LIMIT,
  type DesktopState,
  type DesktopWindow,
} from './slice';

const init = (): DesktopState => reducer(undefined, { type: '@@init' });
const add = (state: DesktopState, title: string, innerWidth = 400, innerHeight = 300) =>
  reducer(state, addWindow({ title, innerWidth, innerHeight, x: 0, y: 0, state: 'normal' }));

/** Window at index i (throws instead of returning undefined). */
const win = (state: DesktopState, i = 0): DesktopWindow => {
  const w = state.windows[i];
  if (!w) throw new Error(`no window at ${i}`);
  return w;
};
const zOf = (state: DesktopState, id: string) => state.zOrder.find((z) => z.windowId === id)?.zIndex;

describe('desktop slice', () => {
  it('has the correct initial state shape', () => {
    const state = init();
    expect(state.windows).toEqual([]);
    expect(state.zOrder).toEqual([]);
    expect(state.activeWindowId).toBeUndefined();
    expect(state.terminalOutput).toEqual({});
  });

  describe('addWindow', () => {
    it('adds a window with defaults', () => {
      const w = win(add(init(), 'Test'));
      expect(w).toMatchObject({ title: 'Test', innerWidth: 400, innerHeight: 300, state: 'normal' });
      expect(w.id).toBeDefined();
    });

    it('adds each window to zOrder', () => {
      const state = add(add(init(), 'Test1'), 'Test2', 300, 200);
      expect(state.zOrder.map((z) => z.zIndex)).toEqual([0, 1]);
    });

    it('gives same-titled windows distinct ids', () => {
      const state = add(add(init(), 'Test1'), 'Test1');
      expect(state.windows).toHaveLength(2);
      expect(win(state, 0).id).not.toBe(win(state, 1).id);
    });
  });

  describe('removeWindow', () => {
    const setup = () => {
      const state = add(add(init(), 'Test1'), 'Test2', 300, 200);
      return { state, id: win(state).id };
    };

    it('removes a window from the desktop', () => {
      const { state, id } = setup();
      const next = reducer(state, removeWindow(id));
      expect(next.windows.map((w) => w.title)).toEqual(['Test2']);
    });

    it('removes window from zOrder', () => {
      const { state, id } = setup();
      const next = reducer(state, removeWindow(id));
      expect(next.zOrder.some((z) => z.windowId === id)).toBe(false);
      expect(next.zOrder).toHaveLength(1);
    });

    it('clears activeWindowId if removed window was active', () => {
      const { state, id } = setup();
      const next = reducer(reducer(state, activateWindow(id)), removeWindow(id));
      expect(next.activeWindowId).toBeUndefined();
    });
  });

  describe('closeWindow', () => {
    const setup = () => {
      const state = add(add(init(), 'Test1'), 'Test2', 300, 200);
      return { state, id: win(state).id };
    };

    it('closes a window', () => {
      const { state, id } = setup();
      const next = reducer(state, closeWindow(id));
      expect(next.windows.map((w) => w.title)).toEqual(['Test2']);
    });

    it('removes window from zOrder', () => {
      const { state, id } = setup();
      const next = reducer(state, closeWindow(id));
      expect(next.zOrder.some((z) => z.windowId === id)).toBe(false);
      expect(next.zOrder).toHaveLength(1);
    });

    it('clears activeWindowId if closed window was active', () => {
      const { state, id } = setup();
      const next = reducer(reducer(state, activateWindow(id)), closeWindow(id));
      expect(next.activeWindowId).toBeUndefined();
    });
  });

  it('updateWindow updates properties and zIndex', () => {
    let state = add(init(), 'Test');
    const id = win(state).id;
    state = reducer(state, updateWindow({ window: { title: 'Updated' }, id, zIndex: 5 }));
    expect(win(state).title).toBe('Updated');
    expect(zOf(state, id)).toBe(5);
  });

  describe('setZOrder', () => {
    it('sets zIndex for an existing window', () => {
      let state = add(init(), 'Test');
      const id = win(state).id;
      state = reducer(state, setZOrder({ windowId: id, zIndex: 5 }));
      expect(zOf(state, id)).toBe(5);
    });

    it('adds an entry for an unknown window', () => {
      const state = reducer(add(init(), 'Test'), setZOrder({ windowId: 'nonexistent', zIndex: 3 }));
      expect(zOf(state, 'nonexistent')).toBe(3);
    });
  });

  it('activateWindow sets activeWindowId', () => {
    let state = add(init(), 'Test');
    state = reducer(state, activateWindow(win(state).id));
    expect(state.activeWindowId).toBe(win(state).id);
  });

  it('focusWindow raises the window above all others and activates it', () => {
    let state = add(add(add(init(), 'A'), 'B'), 'C');
    const a = win(state, 0).id;
    state = reducer(state, focusWindow(a));
    const others = state.zOrder.filter((z) => z.windowId !== a).map((z) => z.zIndex);
    expect(zOf(state, a)).toBeGreaterThan(Math.max(...others));
    expect(state.activeWindowId).toBe(a);
  });

  describe('minimizeWindow', () => {
    it('minimizes a window', () => {
      let state = add(init(), 'Test');
      state = reducer(state, minimizeWindow(win(state).id));
      expect(win(state)).toMatchObject({ minimized: true, maximized: false, state: 'minimized' });
    });
  });

  describe('maximizeWindow', () => {
    it('maximizes a window and keeps its stored bounds for restore', () => {
      let state = add(init(), 'Test');
      state = reducer(state, maximizeWindow(win(state).id));
      expect(win(state)).toMatchObject({ minimized: false, maximized: true, state: 'maximized' });
      expect(win(state)).toMatchObject({ innerWidth: 400, innerHeight: 300 });
    });
  });

  describe('toggleWindowState', () => {
    it('toggles from normal to maximized', () => {
      let state = add(init(), 'Test');
      state = reducer(state, toggleWindowState(win(state).id));
      expect(win(state)).toMatchObject({ maximized: true, state: 'maximized' });
    });

    it('toggles from maximized to normal', () => {
      let state = add(init(), 'Test');
      const id = win(state).id;
      state = reducer(reducer(state, maximizeWindow(id)), toggleWindowState(id));
      expect(win(state)).toMatchObject({ maximized: false, state: 'normal' });
    });
  });

  it('setWindowBounds sets position and size', () => {
    let state = add(init(), 'Test');
    state = reducer(state, setWindowBounds({ windowId: win(state).id, x: 100, y: 50, width: 800, height: 600 }));
    expect(win(state)).toMatchObject({ x: 100, y: 50, innerWidth: 800, innerHeight: 600 });
  });

  it('openAppWindow opens a staggered, active window for the app and machine', () => {
    let state = reducer(init(), openAppWindow({ app: 'Terminal', title: 'T1', machineId: 'm1' }));
    state = reducer(state, openAppWindow({ app: 'ServicesPanel', title: 'S1', machineId: 'm1' }));
    const [first, second] = [win(state, 0), win(state, 1)];
    expect(first).toMatchObject({ app: 'Terminal', machineId: 'm1' });
    expect(second.x).toBeGreaterThan(first.x);
    expect(state.activeWindowId).toBe(second.id);
  });

  it('appendTerminalOutput keeps per-machine output bounded', () => {
    let state = init();
    for (let i = 0; i < TERMINAL_OUTPUT_LIMIT + 5; i++) {
      state = reducer(state, appendTerminalOutput({ machineId: 'm1', output: `line ${i}` }));
    }
    const out = state.terminalOutput['m1'] ?? [];
    expect(out).toHaveLength(TERMINAL_OUTPUT_LIMIT);
    expect(out.at(-1)).toBe(`line ${TERMINAL_OUTPUT_LIMIT + 4}`);
    expect(state.terminalOutput['m2']).toBeUndefined();
  });
});
