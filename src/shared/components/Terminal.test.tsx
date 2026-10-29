import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Terminal, type TerminalHandle } from './Terminal';

// xterm renders to a canvas jsdom doesn't have; record what the component does with it.
const xterm = vi.hoisted(() => ({
  instances: [] as Array<{
    opts: { theme?: { background?: string; foreground?: string } };
    opened: Element | null;
    out: string[];
    addons: number;
    disposed: boolean;
    type: (d: string) => void;
  }>,
}));
vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    rec: (typeof xterm.instances)[number];
    private handlers: Array<(d: string) => void> = [];
    constructor(opts: (typeof xterm.instances)[number]['opts']) {
      this.rec = { opts, opened: null, out: [], addons: 0, disposed: false, type: (d) => this.handlers.forEach((h) => h(d)) };
      xterm.instances.push(this.rec);
    }
    loadAddon() {
      this.rec.addons += 1;
    }
    open(el: Element) {
      this.rec.opened = el;
    }
    write(d: string) {
      this.rec.out.push(d);
    }
    writeln(d: string) {
      this.rec.out.push(d + '\n');
    }
    clear() {}
    focus() {}
    dispose() {
      this.rec.disposed = true;
    }
    onData(h: (d: string) => void) {
      this.handlers.push(h);
      return { dispose() {} };
    }
  },
}));
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit() {} } }));
vi.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class {} }));

describe('Terminal Component', () => {
  beforeEach(() => {
    xterm.instances.length = 0;
  });

  it('renders a terminal container and mounts xterm with fit + web-links addons', () => {
    render(<Terminal ariaLabel="Shell" />);
    const el = screen.getByTestId('terminal');
    expect(xterm.instances).toHaveLength(1);
    expect(xterm.instances[0]?.opened).toBe(el);
    expect(xterm.instances[0]?.addons).toBe(2);
  });

  it('applies CSS variable styling to the container and the xterm theme', () => {
    document.documentElement.style.setProperty('--bg', '#101010');
    document.documentElement.style.setProperty('--fg', '#eeeeee');
    render(<Terminal ariaLabel="Shell" />);
    const el = screen.getByTestId('terminal');
    expect(el.style.backgroundColor).toBe('var(--bg)');
    expect(el.style.color).toBe('var(--fg)');
    expect(xterm.instances[0]?.opts.theme).toMatchObject({ background: '#101010', foreground: '#eeeeee' });
  });

  it('has an accessible, labelled region', () => {
    render(<Terminal ariaLabel="Shell on ws-01" />);
    expect(screen.getByRole('region', { name: 'Shell on ws-01' })).toBe(screen.getByTestId('terminal'));
  });

  it('exposes write/writeln via ref, forwards keystrokes, and disposes on unmount', () => {
    const ref = createRef<TerminalHandle>();
    const onData = vi.fn();
    const { unmount } = render(<Terminal ref={ref} ariaLabel="Shell" onData={onData} />);
    ref.current?.write('a');
    ref.current?.writeln('b');
    expect(xterm.instances[0]?.out).toEqual(['a', 'b\n']);
    xterm.instances[0]?.type('x');
    expect(onData).toHaveBeenCalledWith('x');
    unmount();
    expect(xterm.instances[0]?.disposed).toBe(true);
  });
});
