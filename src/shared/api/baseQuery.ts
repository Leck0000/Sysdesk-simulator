/**
 * Shared RTK Query base query: one place for the API base URL and the
 * bearer token, read from the store with type guards (no casts).
 */
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/** Extract auth.accessToken from an unknown store state. */
export function readAccessToken(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('auth' in state)) return '';
  const { auth } = state;
  if (typeof auth !== 'object' || auth === null || !('accessToken' in auth)) return '';
  return typeof auth.accessToken === 'string' ? auth.accessToken : '';
}

export const apiBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL ?? '',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = readAccessToken(getState());
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});
