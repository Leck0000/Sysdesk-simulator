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

  describe('removeWindow / closeWindow', () => {
    for (const [name, action] of [
      ['removeWindow', removeWindow],
      ['closeWindow', closeWindow],
    ] as const) {
      it(`${name} removes the window, its zOrder entry and active id`, () => {
        let state = add(add(init(), 'Test1'), 'Test2', 300, 200);
        const id = win(state).id;
        state = reducer(state, activateWindow(id));
        state = reducer(state, action(id));
        expect(state.windows.map((w) => w.title)).toEqual(['Test2']);
        expect(state.zOrder.some((z) => z.windowId === id)).toBe(false);
        expect(state.activeWindowId).toBeUndefined();
      });
    }
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

  it('minimize / maximize / toggle update flags and state', () => {
    let state = add(init(), 'Test');
    const id = win(state).id;
    state = reducer(state, minimizeWindow(id));
    expect(win(state)).toMatchObject({ minimized: true, maximized: false, state: 'minimized' });
    state = reducer(state, maximizeWindow(id));
    expect(win(state)).toMatchObject({ minimized: false, maximized: true, state: 'maximized' });
    state = reducer(state, toggleWindowState(id));
    expect(win(state)).toMatchObject({ maximized: false, state: 'normal' });
    state = reducer(state, toggleWindowState(id));
    expect(win(state)).toMatchObject({ maximized: true, state: 'maximized' });
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
