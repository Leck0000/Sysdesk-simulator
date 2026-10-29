/**
 * Desktop app registry — maps each AppType key to its title and a lazily
 * loaded content component. Used by the launcher (to open windows) and the
 * WindowManager (to render window content).
 */
import React from 'react';
import type { AppType } from './slice';

export type AppKey = keyof typeof AppType;

export interface AppContentProps {
  windowId: string;
}

interface AppDefinition {
  title: string;
  icon: string;
  Component: React.LazyExoticComponent<React.ComponentType<AppContentProps>>;
}

export const APP_REGISTRY: Record<AppKey, AppDefinition> = {
  Terminal: {
    title: 'Terminal',
    icon: '>_',
    Component: React.lazy(() => import('./TerminalWindow').then((m) => ({ default: m.TerminalWindow }))),
  },
  EventViewer: {
    title: 'Event Viewer',
    icon: '📋',
    Component: React.lazy(() => import('./EventViewer').then((m) => ({ default: m.EventViewer }))),
  },
  ServicesPanel: {
    title: 'Services',
    icon: '⚙',
    Component: React.lazy(() => import('./ServicesPanel').then((m) => ({ default: m.ServicesPanel }))),
  },
  RegistryEditor: {
    title: 'Registry Editor',
    icon: '🗂',
    Component: React.lazy(() => import('./RegistryEditor').then((m) => ({ default: m.RegistryEditor }))),
  },
  NetworkPanel: {
    title: 'Network Connections',
    icon: '🌐',
    Component: React.lazy(() => import('./NetworkPanel').then((m) => ({ default: m.NetworkPanel }))),
  },
  ADUsersComputers: {
    title: 'AD Users and Computers',
    icon: '👥',
    Component: React.lazy(() =>
      import('./ADUsersComputers').then((m) => ({ default: m.ADUsersComputers }))
    ),
  },
  FileExplorer: {
    title: 'File Explorer',
    icon: '📁',
    Component: React.lazy(() => import('./FileExplorer').then((m) => ({ default: m.FileExplorer }))),
  },
};

export const APP_KEYS = Object.keys(APP_REGISTRY) as AppKey[];

export function isAppKey(value: unknown): value is AppKey {
  return typeof value === 'string' && value in APP_REGISTRY;
}
