/**
 * certificates slice — gallery state mirroring ARCHITECTURE.md data models
 *
 * Consumes: certificatesApi (RTK Query) for list/get/issue/validate,
 *           authSlice (userId for gallery filtering)
 * Produces: certificatesSlice with gallery filters, selected certificate, UI state
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Certificate, CertificateListItem } from './api';

// ---------------------------------------------------------------------------
// Initial certificates state
// ---------------------------------------------------------------------------

interface CertificatesState {
  /** Gallery filter: userId to show only user's certificates */
  galleryUserId: string | null;
  /** Gallery filter: labId to show only lab's certificates */
  galleryLabId: string | null;
  /** Gallery filter: status filter (all, active, expired, revoked) */
  galleryFilterStatus: 'all' | 'active' | 'expired' | 'revoked';
  /** Currently selected certificate for detail view */
  selectedCertificate: Certificate | null;
  /** UI status for gallery operations */
  uiStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  /** Error message if any */
  error: string | null;
}

const initialState: CertificatesState = {
  galleryUserId: null,
  galleryLabId: null,
  galleryFilterStatus: 'all',
  selectedCertificate: null,
  uiStatus: 'idle',
  error: null,
};

// ---------------------------------------------------------------------------
// Certificates slice
// ---------------------------------------------------------------------------

export const certificatesSlice = createSlice({
  name: 'certificates',
  initialState,
  reducers: {
    /** Set gallery user filter */
    setGalleryUserFilter: (state, action: PayloadAction<string | null>) => {
      state.galleryUserId = action.payload;
    },

    /** Set gallery lab filter */
    setGalleryLabFilter: (state, action: PayloadAction<string | null>) => {
      state.galleryLabId = action.payload;
    },

    /** Set gallery status filter */
    setGalleryFilterStatus: (state, action: PayloadAction<'all' | 'active' | 'expired' | 'revoked'>) => {
      state.galleryFilterStatus = action.payload;
    },

    /** Set selected certificate for detail view */
    setSelectedCertificate: (state, action: PayloadAction<Certificate | null>) => {
      state.selectedCertificate = action.payload;
    },

    /** Clear all filters */
    clearGalleryFilters: (state) => {
      state.galleryUserId = null;
      state.galleryLabId = null;
      state.galleryFilterStatus = 'all';
    },

    /** Reset gallery and UI status */
    resetGalleryStatus: (state) => {
      state.uiStatus = 'idle';
      state.error = null;
    },

    /** Set gallery loading state */
    setGalleryLoading: (state, action: PayloadAction<boolean>) => {
      state.uiStatus = action.payload ? 'loading' : 'idle';
    },

    /** Set gallery error */
    setGalleryError: (state, action: PayloadAction<string>) => {
      state.uiStatus = 'failed';
      state.error = action.payload;
    },
  },
});

// ---------------------------------------------------------------------------
// Action creators
// ---------------------------------------------------------------------------

export const {
  setGalleryUserFilter,
  setGalleryLabFilter,
  setGalleryFilterStatus,
  setSelectedCertificate,
  clearGalleryFilters,
  resetGalleryStatus,
  setGalleryLoading,
  setGalleryError,
} = certificatesSlice.actions;

export default certificatesSlice.reducer;