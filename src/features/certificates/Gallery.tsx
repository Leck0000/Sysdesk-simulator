/**
 * Certificate Gallery component — grid of issued certificates with verification links
 *
 * Consumes: authSlice (userId for gallery filtering), certificatesApi (useListCertificatesQuery),
 * certificatesSlice (filters), produces: Gallery grid (issued certificates with verification links)
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA — focus-visible outlines, ARIA labels, keyboard navigation.
 * Responsive: >=1280px desktop-first; sidebar collapses to drawer <1024px.
 */

import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useListCertificatesQuery } from '../../features/certificates/api';
import { z } from 'zod';
import {
  setGalleryUserFilter,
  setGalleryLabFilter,
  setGalleryFilterStatus,
  clearGalleryFilters,
} from '../../features/certificates/slice';
import { selectAuthUserId } from '../../features/auth/api';

// ---------------------------------------------------------------------------
// Zod schema for gallery item validation (boundary — never pass raw data downstream)
// ---------------------------------------------------------------------------

const GalleryItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  labId: z.string().uuid(),
  verificationId: z.string().uuid(),
  earnedCriteria: z.enum(['all_steps', 'majority', 'custom']),
  signedPayload: z.object({
    signature: z.string(),
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  }),
  expiryDate: z.string().datetime(),
  createdAt: z.string().datetime(),
});

type GalleryItem = z.infer<typeof GalleryItemSchema>;

// ---------------------------------------------------------------------------
// CertificateCard component — individual certificate card
// ---------------------------------------------------------------------------

const CertificateCard: React.FC<{ item: GalleryItem }> = ({ item }) => {
  const issuedAt = new Date(item.signedPayload.issuedAt);
  const isExpired = item.signedPayload.expiresAt
    ? new Date(item.signedPayload.expiresAt) < new Date()
    : false;

  return (
    <article
      key={item.id}
      className="group border rounded-lg p-4 transition-colors duration-300 hover:shadow-lg"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      aria-label={`Certificate ${item.id.substring(0, 8)} — ${item.earnedCriteria}`}
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
          {item.id.substring(0, 3).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-var(--fg) line-clamp-1"
            style={{ overflow: 'hidden' }}>
            {item.earnedCriteria}
          </h3>
          <p className="text-xs text-var(--muted) line-clamp-1"
            style={{ overflow: 'hidden' }}>
            Lab: {item.labId.substring(0, 8)}… • Issued: {issuedAt.toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <a
          href={`/verify/${item.earnedCriteria}/${item.id}`}
          className="text-var(--accent) underline group-hover:underline-offset-4"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Verify certificate ${item.id}`}>
          Verify
        </a>
      </div>
      {isExpired && (
        <p className="text-var(--muted) text-xs mt-1">
          <span role="status">Certificate expired</span>
        </p>
      )}
    </article>
  );
};

// ---------------------------------------------------------------------------
// CertificateGallery component
// ---------------------------------------------------------------------------

export const CertificateGallery: React.FC = () => {
  const dispatch = useDispatch();

  // Get authenticated user ID from auth slice
  const authUserId = useSelector((state: any) => selectAuthUserId(state));

  // Get gallery filters from certificates slice state
  const galleryUserFilter = useSelector(
    (state: any) => state.certificates.galleryUserId
  );
  const galleryLabFilter = useSelector(
    (state: any) => state.certificates.galleryLabId
  );
  const galleryFilterStatus = useSelector(
    (state: any) => state.certificates.galleryFilterStatus
  );

  // Determine if we should use lazy or regular query
  // Use regular query with user filter if we have an authenticated user
  const {
    data,
    isLoading,
    isError,
    error,
  } = useListCertificatesQuery(
    authUserId ? { userId: authUserId } : undefined,
    {
      // enabled only fetches when there's a userId or when explicitly needed
      enabled: authUserId !== undefined,
    }
  );

  // Apply additional filters from the slice state
  useEffect(() => {
    if (!authUserId) return;

    // If user filter differs from auth userId, sync them
    if (galleryUserFilter !== authUserId) {
      dispatch(setGalleryUserFilter(authUserId));
    }
  }, [authUserId, galleryUserFilter, dispatch]);

  // Filter the certificates based on gallery state
  const items: GalleryItem[] = data
    ? data
        .filter(
          (item: any) =>
            (!galleryUserFilter || item.userId === galleryUserFilter) &&
            (galleryFilterStatus === 'all' ||
              // Simple status filtering based on expiry
              (galleryFilterStatus === 'active' &&
                !item.signedPayload.expiresAt) ||
              (galleryFilterStatus === 'expired' &&
                item.signedPayload.expiresAt) ||
              (galleryFilterStatus === 'revoked', false))
        )
        .filter(
          (item: any) =>
            !galleryLabFilter || item.labId === galleryLabFilter
        )
    : [];

  const errorMsg = useSelector(
    (state: any) => state.certificates.error
  );

  return (
    <section
      className="gallery-section"
      aria-label="Certificate gallery"
    >
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-var(--fg)">
          Certificate Gallery
        </h2>
        {authUserId && (
          <button
            onClick={() => dispatch(clearGalleryFilters())}
            className="text-var(--muted) hover:text-var(--accent) transition-colors"
            aria-label="Clear all filters"
          >
            Clear filters
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="alert" style={{ color: 'var(--accent)' }}>
          Loading certificates…
        </div>
      ) : errorMsg ? (
        <div className="alert alert-error" style={{ color: 'var(--fg)' }}>
          {errorMsg}
        </div>
      ) : items.length === 0 ? (
        <p className="text-var(--muted) text-center">
          No certificates found.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item: GalleryItem) => (
            <CertificateCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
