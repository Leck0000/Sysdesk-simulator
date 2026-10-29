/**
 * Terminal — xterm.js (@xterm/xterm) with fit + web-links addons.
 *
 * Consumes: none (self-contained widget)
 * Produces: an xterm instance mounted in a themed container; imperative
 *           handle `write`/`writeln`/`clear` via ref; `onData` for keystrokes.
 *
 * Strict TS: typed imports, no globals and no `any`.
 * Theming: colors are resolved from the CSS variables (--bg, --fg, --accent)
 *          at mount, because xterm renders to a canvas and cannot read var().
 * Accessibility: xterm screen-reader mode is enabled; container is labelled.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Terminal as XTerm, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

export interface TerminalHandle {
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  focus: () => void;
}

export interface TerminalProps {
  /** Accessible name for the terminal region. */
  ariaLabel: string;
  /** Raw keystroke data typed by the user. */
  onData?: (data: string) => void;
  className?: string;
  style?: CSSProperties;
}

/** Read the theme CSS variables so xterm's canvas matches the app theme. */
function themeFromCssVars(el: HTMLElement): ITheme {
  const css = getComputedStyle(el);
  const pick = (name: string) => css.getPropertyValue(name).trim() || undefined;
  return {
    background: pick('--bg'),
    foreground: pick('--fg'),
    cursor: pick('--accent'),
    selectionBackground: pick('--border'),
  };
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(function Terminal(
  { ariaLabel, onData, className, style },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useImperativeHandle(
    ref,
    () => ({
      write: (data) => termRef.current?.write(data),
      writeln: (data) => termRef.current?.writeln(data),
      clear: () => termRef.current?.clear(),
      focus: () => termRef.current?.focus(),
    }),
    []
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const term = new XTerm({
      cursorBlink: true,
      convertEol: true,
      scrollback: 1000,
      fontSize: 13,
      fontFamily: 'ui-monospace, Menlo, Monaco, "Cascadia Mono", Consolas, monospace',
      screenReaderMode: true,
      theme: themeFromCssVars(el),
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(el);
    termRef.current = term;

    const dataSub = term.onData((data) => onDataRef.current?.(data));
    const refit = () => {
      try {
        fit.fit();
      } catch {
        // container not laid out yet (e.g. hidden); next resize will fit
      }
    };
    refit();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(refit) : null;
    observer?.observe(el);

    return () => {
      observer?.disconnect();
      dataSub.dispose();
      term.dispose();
      termRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="terminal"
      role="region"
      aria-label={ariaLabel}
      className={className}
      style={{ width: '100%', height: '100%', minHeight: 120, backgroundColor: 'var(--bg)', color: 'var(--fg)', ...style }}
    />
  );
});
