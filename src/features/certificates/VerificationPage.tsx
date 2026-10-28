/**
 * Certificate Gallery component — grid of issued certificates with verification links
 *
 * Consumes: authSlice (userId for gallery filtering), certificatesApi (useListCertificatesQuery,
 * useLazyListCertificatesQuery), certificatesSlice (filters, selected cert)
 * Produces: Gallery grid (issued certificates with verification links), responsive layout
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA — focus-visible outlines, ARIA labels, keyboard navigation.
 * Responsive: >=1280px desktop-first; sidebar collapses to drawer <1024px.
 */

import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@reduxjs/toolkit/query/react';
import { z } from 'zod';
import {
  useListCertificatesQuery,
  useLazyListCertificatesQuery,
} from '../../features/certificates/api';
import {
  selectGalleryUserFilter,
  selectGalleryLabFilter,
  selectGalleryStatusFilter,
  selectSelectedCertificate,
  selectGalleryError,
  selectIsCertificatesLoading,
  clearGalleryFilters,
} from '../../features/certificates/slice';
import { selectAuthUserId } from '../../features/auth/api';

// ---------------------------------------------------------------------------
// Zod schemas for gallery item validation (boundary — never pass raw data downstream)
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

const CertificateCard: React.FC<{ item: GalleryItem; verificationUrl: string }> = ({
  item,
  verificationUrl,
}) => {
  const isStale = Date.now() - new Date(item.signedPayload.issuedAt).getTime() > 30 * 24 * 60 * 60 * 1000;

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
            Lab: {item.labId.substring(0, 8)}... • Issued: {new Date(item.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <a
          href={`${verificationUrl}/${item.earnedCriteria === 'all_steps' ? 'all' : item.earnedCriteria}/${item.id}`}
          className="text-var(--accent) underline group-hover:underline-offset-4"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Verify certificate ${item.id} — opens in new tab`}
        >
          Verify
        </a>
      </div>
      {isStale && (
        <p className="text-var(--muted) text-xs mt-1">
          <span role="status">Certificate may be stale (issued >30 days ago)</span>
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
  const authUserId = useSelector(selectAuthUserId);

  // Get gallery filters from certificates slice
  const galleryUserFilter = useSelector(selectGalleryUserFilter);
  const galleryLabFilter = useSelector(selectGalleryLabFilter);
  const galleryStatusFilter = useSelector(selectGalleryStatusFilter);

  // Determine gallery query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (galleryUserFilter) params.user_id = galleryUserFilter;
    if (galleryLabFilter) params.lab_id = galleryLabFilter;
    if (galleryStatusFilter !== 'all') params.status = galleryStatusFilter;
    return params;
  }, [galleryUserFilter, galleryLabFilter, galleryStatusFilter]);

  // Use lazy query if no user filter (to fetch all), otherwise use regular query
  const { data, isLoading, isError, error } = useListCertificatesQuery(
    galleryUserFilter ? { userId: galleryUserFilter } : undefined,
    {
      enabled: !galleryUserFilter, // only fetch all when no user filter; filtered uses separate logic
    }
  );

  // If we have a user filter and no data yet, also try with the filter
  useEffect(() => {
    if (galleryUserFilter && !data) {
      // Fetch with user filter
      dispatch(useListCertificatesQuery({ userId: galleryUserFilter }));
    }
  }, [galleryUserFilter, data, dispatch]);

  const items: GalleryItem[] = data
    ? data.filter((item: any) => {
        const matchesUser = !galleryUserFilter || item.userId === galleryUserFilter;
        const matchesLab = !galleryLabFilter || item.labId === galleryLabFilter;
        const matchesStatus =
          galleryStatusFilter === 'all' ||
          (galleryStatusFilter === 'active' && !item.signedPayload.expiresAt ? true : galleryStatusFilter === 'expired' && item.signedPayload.expiresAt ? true : false) ||
          (galleryStatusFilter === 'revoked', false);
        return matchesUser && matchesLab && matchesStatus;
      })
    : [];

  const errorMsg = useSelector(selectGalleryError);

  return (
    <section
      className="gallery-section"
      aria-label="Certificate gallery"
    >
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-var(--fg)">

I need to rethink this approach. Let me now create the VerificationPage component and then the routes. Let me start more carefully with simpler components.</think>Let me re-examine what's needed and create the files more carefully. Let me first create the VerificationPage, then the Gallery, then update routes.
<tool_call>
<function=write_file>
<parameter=content>
/**
 * Certificate Verification Page — public page to verify a certificate's signature and payload
 *
 * Consumes: No auth required — public endpoint
 * Produces: VerificationPage (fetches `/certificates/validate`, shows payload + signature status)
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA — focus-visible outlines, ARIA labels, keyboard navigation.
 * Responsive: >=1280px desktop; <1024px single-column.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Zod schemas for verification boundary validation
// ---------------------------------------------------------------------------

const VerificationResultSchema = z.object({
  valid: z.boolean(),
  payload: z
    .object({
      ticket_type: z.string(),
      ticket_id: z.string(),
      score: z.number(),
      criteria_met: z.record(z.string(), z.number()),
      rubric_hash: z.string(),
      issued_at: z.number(),
    })
    .optional(),
  signature: z.string().optional(),
  error: z.string().optional(),
});

type VerificationResult = z.infer<typeof VerificationResultSchema>;

const CertificateIdSchema = z.object({
  type: z.string(),
  id: z.string().uuid(),
});

type CertificateId = z.infer<typeof CertificateIdSchema>;

// ---------------------------------------------------------------------------
// VerificationPage component
// ---------------------------------------------------------------------------

export const VerificationPage: React.FC = () => {
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [certificateId, setCertificateId] = useState<CertificateId | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useSearchParams();

  // Check if we were redirected from a verification flow with type/id params
  useEffect(() => {
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (type && id) {
      setCertificateId({ type, id });
      // Fetch verification result
      fetchVerificationResult(type, id);
    }
  }, [searchParams]);

  // Fetch verification result from the public endpoint
  const fetchVerificationResult = async (type: string, id: string) => {
    setIsLoading(true);
    setShowError(false);
    try {
      const response = await fetch(`/api/certificates/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verificationId: id }),
      });

      const data = await response.json();

      // Validate with Zod at boundary
      const result = VerificationResultSchema.safeParse(data);
      if (!result.success) {
        setVerificationResult({
          valid: false,
          error: 'Invalid verification response from server',
        });
        return;
      }

      setVerificationResult(result.data);

      // Extract certificate ID info
      if (result.data.payload) {
        setCertificateId({
          type,
          id,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setVerificationResult({ valid: false, error: message });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual verification input
  const handleVerify = async (type: string, id: string) => {
    await fetchVerificationResult(type, id);
  };

  if (!certificateId) {
    return (
      <section
        className="verification-page"
        aria-label="Certificate verification page"
      >
        <header className="verification-page__header">
          <h1 className="text-3xl font-bold text-var(--fg)">
            Verify Certificate
          </h1>
          <p className="text-var(--muted)">
            Enter a certificate verification ID to check its signature and payload.
          </p>
        </header>

        <div className="verification-page__form">
          <p className="text-var(--muted) mb-4">
            Or scan a verification link from your certificate gallery.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-var(--fg) mb-2">
              Certificate ID
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-var(--border) p-3 focus:outline-none focus:ring-2 focus:ring-var(--accent) transition-colors"
              placeholder="cert-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              defaultValue={searchParams.get('id') || ''}
              aria-label="Certificate verification ID"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-var(--fg) mb-2">
              Certificate Type
            </label>
            <select
              className="w-full rounded-md border border-var(--border) p-3 focus:outline-none focus:ring-2 focus:ring-var(--accent) transition-colors"
              aria-label="Certificate type"
            >
              <option value="">Select type</option>
              <option value="all_steps">all_steps</option>
              <option value="majority">majority</option>
              <option value="custom">custom</option>
            </select>
          </div>

          <button
            onClick={() => {
              const type = (document.querySelector('select') as HTMLSelectElement)?.value || '';
              if (!type || !certificateId?.id) return;
              handleVerify(type, certificateId.id);
            }}
            className="btn-primary"
            disabled={isLoading}
            aria-disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify Certificate'}
          </button>
        </div>
      </section>
    );
  }

  // Show verification result
  return (
    <section
      className="verification-page"
      aria-label="Certificate verification result"
    >
      <header className="verification-page__header">
        <h1 className="text-3xl font-bold text-var(--fg)">
          Verify Certificate
        </h1>
      </header>

      <div className="max-w-2xl mx-auto py-8">
        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-var(--accent) mx-auto mb-4"></div>
            <p className="text-var(--muted)">Verifying certificate...</p>
          </div>
        ) : verificationResult ? (
          <div className={`p-4 rounded-lg ${verificationResult.valid ? 'bg-var(--card) text-var(--fg)' : 'bg-var(--error) text-var(--on-error)'}`}>
            {verificationResult.valid ? (
              <div>
                <h2 className="text-2xl font-bold text-var(--fg) mb-2">
                  ✓ Certificate Valid
                </h2>
                <p className="text-var(--muted) mb-4">
                  The certificate signature is valid and the payload is verified.
                </p>

                {verificationResult.payload && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-var(--muted) mb-1">Ticket Type</p>
                      <p className="text-var(--fg) font-mono">{verificationResult.payload.ticket_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-var(--muted) mb-1">Ticket ID</p>
                      <p className="text-var(--fg) font-mono">{verificationResult.payload.ticket_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-var(--muted) mb-1">Score</p>
                      <p className="text-var(--fg) font-mono">
                        {verificationResult.payload.score}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-var(--muted) mb-1">Criteria Met</p>
                      <p className="text-var(--fg)">{JSON.stringify(
                        verificationResult.payload.criteria_met,
                        null,
                        2
                      )}</p>
                    </div>
                    <div>
                      <p className="text-sm text-var(--muted) mb-1">Issued At</p>
                      <p className="text-var(--fg) font-mono">
                        {new Date(verificationResult.payload.issued_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {verificationResult.signature && (
                  <div>
                    <p className="text-sm text-var(--muted) mb-1">Signature</p>
                    <p className="text-var(--fg) truncate" title={verificationResult.signature}>
                      {verificationResult.signature.substring(0, 16)}…
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-var(--error) mb-2">
                  ✗ Certificate Invalid
                </h2>
                <p className="text-var(--muted) mb-4">
                  The certificate could not be verified. The signature may be tampered
                  or the certificate may be expired/revoked.
                </p>
                {verificationResult.error && (
                  <p className="text-var(--error) mb-4">{verificationResult.error}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-var(--muted) text-center">
            Enter a certificate ID above to verify.
          </p>
        )}
      </div>
    </section>
  );
};