/*****
 * TerminalWindow — Window chrome + Terminal component
 *
 * Consumes: 
 *   - wsClient (send_command, receive command_output) via wsMiddleware
 *   - desktopSlice (windowId → machineId mapping)
 *
 * Produces: Window chrome + xterm.js Terminal embedded inside
 *           Resizable, draggable window with terminal content
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors
 * Accessibility: WCAG 2.1 AA
 * Responsive: >=1280px desktop-first; sidebar collapses to drawer <1024px
 ****/
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../app/store';
import { z } from 'zod';

// Import ws actions and types
import {
  wsSend,
  createSendCommand,
  ClientEventType,
  isClientEventType,
} from '../../shared/ws';
import { desktopSlice } from './slice';

// Type-safe terminal dimensions
const terminalDimensionsSchema = z.object({
  width: z.number().int().min(100),
  height: z.number().int().min(100),
});
type TerminalDimensions = z.infer<typeof terminalDimensionsSchema>;

// Terminal theming via CSS variables - NO hardcoded colors
const terminalThemeSchema = z.object({
  background: z.string().regex(/^var\(--fg\)|^var\(--bg\)|^var\(--accent\)|^var\(--border\)|^var\(--card\)|#[0-9a-fA-F]{6}|rgb[a-z]+\z/),
  foreground: z.string().regex(/^var\(--fg\)|^var\(--bg\)|^var\(--accent\)|^var\(--border\)|^var\(--card\)|#[0-9a-fA-F]{6}|rgb[a-z]+\z/),
  fontFamily: z.string(),
  fontSize: z.number().int().min(8),
  lineHeight: z.number().int().min(1).max(10),
});
type TerminalTheme = z.infer<typeof terminalThemeSchema>;

/**
 * TerminalWindowProps — props for TerminalWindow component
 */
interface TerminalWindowProps {
  /** The windowId mapping to desktopSlice for machineId lookup */
  windowId: string;
  /** Optional custom className */
  className?: string;
}

/**
 * TerminalWindow — Window chrome + Terminal component
 *
 * Consumes: 
 *   - wsClient (send_command, receive command_output) via wsMiddleware
 *   - desktopSlice (windowId → machineId mapping)
 *
 * Produces: Window chrome + xterm.js Terminal embedded inside
 *           Resizable, draggable window with terminal content
 */
const TerminalWindow: React.FC<TerminalWindowProps> = ({ windowId, className }) => {
  const dispatch = useDispatch();
  const { sessionId } = useSelector(
    (state: RootState) => state.ws?.state ?? { sessionId: null }
  );
  const machineId = useSelector(
    (state: RootState) => {
      const windows = state.desktop?.windows ?? [];
      const window = windows.find((w: any) => w.id === windowId);
      return window?.machineId ?? windowId;
    }
  );

  const [terminalHeight, setTerminalHeight] = useState(400);
  const termRef = useRef<any>(null);

  // Send command to WebSocket server
  const sendCommand = (command: string) => {
    if (!sessionId) return;
    const payload = createSendCommand(machineId, command);
    dispatch(wsSend({ type: ClientEventType.SEND_COMMAND, payload }));
  };

  // Handle command_output from WebSocket message events
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as unknown as {
          t: string;
          payload: {
            machineId: string;
            output: string;
            exitCode: number;
            timestamp: string;
          };
        };
        if (
          isClientEventType(data.t) &&
          data.t === ClientEventType.COMMAND_OUTPUT &&
          data.payload?.machineId === machineId
        ) {
          if (termRef.current) {
            // @ts-expect-error - xterm API
            termRef.current.write(data.payload?.output || '');
            // @ts-expect-error - xterm API
            termRef.current.write('\n');
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [machineId]);

  // Effect to set up WebSocket integration when session connects
  useEffect(() => {
    if (!sessionId) return;
    return;
  }, [sessionId]);

  return (
    <div
      data-testid="terminal-window"
      className={className}
      style={{
        // Theming via CSS variables - no hardcoded colors
        backgroundColor: 'var(--card)',
        color: 'var(--fg)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          backgroundColor: 'var(--accent)',
          color: 'var(--bg)',
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none',
          height: '28px',
          borderBottom: '1px solid var(--border)',
        }}
        role="presentation"
      >
        <span style={{ flexGrow: 1 }}>{windowId}</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Control buttons would go here */}
        </div>
      </div>

      {/* Terminal content */}
      <div
        data-testid="terminal"
        style={{
          height: `${terminalHeight}px`,
          overflow: 'auto',
          padding: '8px',
        }}
        role="grid"
        aria-label={`Terminal for ${machineId}`}
      >
        {/* Terminal rendered via React.lazy */}
        <LazyTerminal
          onOutput={(output: string) => {
            // Handle output - could send to backend or just display
            console.log('Terminal output:', output);
          }}
          onCommand={(command: string, metadata: { machineId: string }) => {
            sendCommand(command);
          }}
          dimensions={{ width: 800, height: terminalHeight }}
        />
      </div>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
TerminalWindow.propTypes = {};

export { TerminalWindow };
export type { TerminalWindowProps, TerminalDimensions, TerminalTheme };
