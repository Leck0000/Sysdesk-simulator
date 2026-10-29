/**
 * useSubsystemData — read one simulated-OS subsystem (services, registry, ...)
 * from desktop.subsystems and validate it with a Zod schema.
 *
 * Data arrives as WS `state.delta` { subsystem, op, value } and is stored by
 * wsMiddleware -> applyStateDelta. Until the first delta, status is 'loading'.
 */
import { useMemo } from 'react';
import type { z } from 'zod';
import { useAppSelector } from '../../app/hooks';

export type SubsystemData<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'invalid'; data: null; error: string };

export function useSubsystemData<S extends z.ZodType>(subsystem: string, schema: S): SubsystemData<z.infer<S>> {
  const raw = useAppSelector((state) => state.desktop.subsystems[subsystem]);
  return useMemo(() => {
    if (raw === undefined) return { status: 'loading', data: null, error: null };
    const parsed = schema.safeParse(raw);
    return parsed.success
      ? { status: 'ready', data: parsed.data, error: null }
      : { status: 'invalid', data: null, error: `Unexpected ${subsystem} data from server` };
  }, [raw, schema, subsystem]);
}
