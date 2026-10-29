/**
 * Pending-state helpers for RTK Query API slices.
 * RTK Query keeps per-request entries in `queries` / `mutations`; these
 * helpers answer "is any request for endpoint X in flight?" without casts.
 */
interface RequestEntry {
  endpointName?: string;
  status?: string;
  originalArgs?: unknown;
}

interface ApiCacheState {
  queries: Record<string, RequestEntry | undefined>;
  mutations: Record<string, RequestEntry | undefined>;
}

const pendingIn = (
  entries: Record<string, RequestEntry | undefined>,
  endpointName: string,
  matchArgs?: (args: unknown) => boolean
): boolean =>
  Object.values(entries).some(
    (e) =>
      e?.endpointName === endpointName &&
      e.status === 'pending' &&
      (matchArgs === undefined || matchArgs(e.originalArgs))
  );

/** True while a query for `endpointName` (optionally with matching args) is loading. */
export const isQueryPending = (api: ApiCacheState, endpointName: string, matchArgs?: (args: unknown) => boolean) =>
  pendingIn(api.queries, endpointName, matchArgs);

/** True while a mutation for `endpointName` is in flight. */
export const isMutationPending = (api: ApiCacheState, endpointName: string) => pendingIn(api.mutations, endpointName);
