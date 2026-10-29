/**
 * Certificate Verification Page — public page to verify a certificate's signature and payload
 *
 * Consumes: No auth required — public endpoint
 * Produces: VerificationPage (fetches `/api/certificates/validate`, shows payload + signature status)
 *
 * Strict TS: no `any`; use `unknown` + zod parsers at boundaries.
 * CSS variables for theming: --fg, --bg, --accent, --border, --card — no hardcoded colors.
 * Accessibility: WCAG 2.1 AA — focus-visible outlines, ARIA labels, keyboard navigation.
 * Responsive: >=1280px desktop; <1024px single-column.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
      issued_at: z.number(),
    })
    .optional(),
  signature: z.string().optional(),
  error: z.string().optional(),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export interface VerificationPageProps {
  /** Pre-resolved result (e.g. tests or deep links); skips the initial fetch */
  verificationResult?: VerificationResult;
  /** Force the loading state */
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// VerificationPage component
// ---------------------------------------------------------------------------

export const VerificationPage: React.FC<VerificationPageProps> = ({
  verificationResult: initialResult,
  isLoading: initialLoading = false,
}) => {
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(
    initialResult ?? null
  );
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [certificateId, setCertificateId] = useState('');

  // Fetch verification result from the public endpoint
  const fetchVerificationResult = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/certificates/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId: id }),
      });

      const data: unknown = await response.json();

      // Validate with Zod at boundary
      const result = VerificationResultSchema.safeParse(data);
      setVerificationResult(
        result.success
          ? result.data
          : { valid: false, error: 'Invalid verification response from server' }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setVerificationResult({ valid: false, error: message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-verify when linked with ?id=<verificationId>
  useEffect(() => {
    if (initialResult) return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      setCertificateId(id);
      void fetchVerificationResult(id);
    }
  }, [initialResult, fetchVerificationResult]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = certificateId.trim();
    if (id) void fetchVerificationResult(id);
  };

  if (isLoading) {
    return (
      <section className="verification-page" aria-label="Certificate verification page">
        <div className="verification-page__content" role="status" aria-live="polite">
          <p style={{ color: 'var(--fg)' }}>Verifying certificate...</p>
        </div>
      </section>
    );
  }

  if (!verificationResult) {
    return (
      <section className="verification-page" aria-label="Certificate verification page">
        <header className="verification-page__header">
          <h1 style={{ color: 'var(--fg)' }}>Verify Certificate</h1>
          <p style={{ color: 'var(--fg)' }}>
            Enter a certificate verification ID to check its signature and payload.
          </p>
        </header>

        <form
          className="verification-page__form"
          aria-label="Certificate verification form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="certificate-id" style={{ color: 'var(--fg)' }}>
            Certificate ID
          </label>
          <input
            id="certificate-id"
            type="text"
            value={certificateId}
            onChange={(e) => setCertificateId(e.target.value)}
            placeholder="cert-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)' }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={!certificateId.trim()}
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            Verify Certificate
          </button>
        </form>
      </section>
    );
  }

  // Show verification result
  return (
    <section className="verification-page" aria-label="Certificate verification result">
      <header className="verification-page__header">
        <h1 style={{ color: 'var(--fg)' }}>Verify Certificate</h1>
      </header>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {verificationResult.valid ? (
          <div>
            <h2 style={{ color: 'var(--fg)' }}>
              <span aria-hidden="true">✓ </span>
              <span>Certificate Valid</span>
            </h2>
            <p style={{ color: 'var(--fg)' }}>
              The certificate signature is valid and the payload is verified.
            </p>

            {verificationResult.payload && (
              <dl>
                <dt>Ticket Type</dt>
                <dd>{verificationResult.payload.ticket_type}</dd>
                <dt>Ticket ID</dt>
                <dd>{verificationResult.payload.ticket_id}</dd>
                <dt>Score</dt>
                <dd>{verificationResult.payload.score}</dd>
              </dl>
            )}
          </div>
        ) : (
          <div role="alert">
            <h2 style={{ color: 'var(--accent)' }}>
              <span aria-hidden="true">✗ </span>
              <span>Certificate Invalid</span>
            </h2>
            <p style={{ color: 'var(--fg)' }}>
              The certificate could not be verified. The signature may be tampered or the
              certificate may be expired/revoked.
            </p>
            {verificationResult.error && <p>{verificationResult.error}</p>}
          </div>
        )}
      </div>
    </section>
  );
};
