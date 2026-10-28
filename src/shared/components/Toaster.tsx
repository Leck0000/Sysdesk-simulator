/**
 * Toaster component — sonner-based toast notifications
 *
 * Consumes: none (standalone component)
 * Produces: Toaster — sonner toast provider with predefined actions
 *
 * Strict TS: no `any`; typed toast options.
 * Accessibility: WCAG 2.1 AA (focus-visible, aria-live).
 */
import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return <SonnerToaster />;
}