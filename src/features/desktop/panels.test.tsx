/**
 * All simulated Windows panels share one data path: ws state.delta ->
 * desktop.subsystems -> useSubsystemData. Verify loading / data / invalid.
 */
import { describe, it, expect } from 'vitest';
import type React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import desktopReducer, { applyStateDelta, openAppWindow } from './slice';
import wsReducer from '../../shared/ws/slice';
import { EventViewer } from './EventViewer';
import { ServicesPanel } from './ServicesPanel';
import { RegistryEditor } from './RegistryEditor';
import { NetworkPanel } from './NetworkPanel';
import { ADUsersComputers } from './ADUsersComputers';
import { FileExplorer } from './FileExplorer';
import { DEMO_SUBSYSTEMS } from '../../app/demo';

const cases: Array<{ name: string; Panel: React.FC<{ windowId: string }>; subsystem: string; loading: RegExp }> = [
  { name: 'EventViewer', Panel: EventViewer, subsystem: 'event-log', loading: /Loading Event Log/ },
  { name: 'ServicesPanel', Panel: ServicesPanel, subsystem: 'services', loading: /Loading Services/ },
  { name: 'RegistryEditor', Panel: RegistryEditor, subsystem: 'registry', loading: /Loading Registry/ },
  { name: 'NetworkPanel', Panel: NetworkPanel, subsystem: 'network', loading: /Loading Network/ },
  { name: 'ADUsersComputers', Panel: ADUsersComputers, subsystem: 'ad', loading: /Loading Active Directory/ },
  { name: 'FileExplorer', Panel: FileExplorer, subsystem: 'filesystem', loading: /Loading File Explorer/ },
];

function setup(Panel: React.FC<{ windowId: string }>) {
  const store = configureStore({ reducer: { desktop: desktopReducer, ws: wsReducer } });
  store.dispatch(openAppWindow({ app: 'Terminal', title: 't', machineId: 'm1' }));
  const id = store.getState().desktop.windows[0]?.id ?? '';
  render(
    <Provider store={store}>
      <Panel windowId={id} />
    </Provider>
  );
  return store;
}

describe.each(cases)('$name data flow', ({ Panel, subsystem, loading }) => {
  it('shows loading until the subsystem has data', () => {
    setup(Panel);
    expect(screen.getByText(loading)).toBeInTheDocument();
  });

  it('leaves loading once a state.delta arrives (empty list)', () => {
    const store = setup(Panel);
    act(() => {
      store.dispatch(applyStateDelta({ subsystem, op: 'set', value: [] }));
    });
    expect(screen.queryByText(loading)).not.toBeInTheDocument();
  });

  it('reports data that fails schema validation', () => {
    const store = setup(Panel);
    act(() => {
      store.dispatch(applyStateDelta({ subsystem, op: 'set', value: [{ bogus: true }] }));
    });
    expect(screen.getByText(new RegExp(`Unexpected ${subsystem} data`))).toBeInTheDocument();
  });
});

const fixtureText: Record<string, RegExp> = {
  services: /Print Spooler/,
  'event-log': /Print Spooler service terminated/,
  registry: /HKLM\\SOFTWARE\\Policies\\.*\\NoAutoUpdate/,
  network: /Ethernet0/,
  ad: /Dana Whitfield/,
  filesystem: /NTFS/,
};

describe('demo subsystem fixtures', () => {
  it.each(cases)('$name renders its demo fixture without a schema error', ({ Panel, subsystem, loading }) => {
    const store = setup(Panel);
    act(() => {
      store.dispatch(applyStateDelta({ subsystem, op: 'set', value: DEMO_SUBSYSTEMS[subsystem] }));
    });
    expect(screen.queryByText(loading)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unexpected .* data/)).not.toBeInTheDocument();
    expect(screen.getAllByText(fixtureText[subsystem] ?? /^$/).length).toBeGreaterThan(0);
  });
});
