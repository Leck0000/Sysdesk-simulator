import { z } from 'zod';
import { describe, it, expect } from 'vitest';

import { certificatesApi } from './api';

// ---------------------------------------------------------------------------
// Certificates API endpoint existence tests
// ---------------------------------------------------------------------------

describe('certificatesApi endpoint existence', () => {
  it('has listCertificates query endpoint', () => {
    expect(certificatesApi.endpoints.listCertificates).toBeDefined();
    expect(typeof certificatesApi.endpoints.listCertificates.query).toBe('function');
  });

  it('has getCertificate query endpoint', () => {
    expect(certificatesApi.endpoints.getCertificate).toBeDefined();
    expect(typeof certificatesApi.endpoints.getCertificate.query).toBe('function');
  });

  it('has issueCertificate mutation endpoint', () => {
    expect(certificatesApi.endpoints.issueCertificate).toBeDefined();
    expect(typeof certificatesApi.endpoints.issueCertificate.mutation).toBe('function');
  });

  it('has validateCertificate mutation endpoint', () => {
    expect(certificatesApi.endpoints.validateCertificate).toBeDefined();
    expect(typeof certificatesApi.endpoints.validateCertificate.mutation).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Zod request schema validation tests
// ---------------------------------------------------------------------------

describe('Zod request schema validation', () => {
  const IssueCertificateRequestSchema = z.object({
    userId: z.string().uuid(),
    labId: z.string().uuid(),
    ticketId: z.string().uuid().nullable(),
    issuedBy: z.string().uuid(),
    expiryDays: z.number().int().positive().optional(),
  });

  const ValidateCertificateRequestSchema = z.object({
    verificationId: z.string().uuid(),
  });

  describe('IssueCertificateRequestSchema', () => {
    it('accepts valid request', () => {
      const result = IssueCertificateRequestSchema.safeParse({
        userId: 'c1e2d3b4-a5f6-7890-abcd-ef1234567890',
        labId: 'l1e2d3b4-a5f6-7890-abcd-ef1234567890',
        ticketId: 'tb12345678-ef90-1234-5678-90abcdef1234',
        issuedBy: 'u12345678-ef90-1234-5678-90abcdef1234',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const result = IssueCertificateRequestSchema.safeParse({
        userId: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ValidateCertificateRequestSchema', () => {
    it('accepts valid verification ID', () => {
      const result = ValidateCertificateRequestSchema.safeParse({
        verificationId: 'v12345678-ef90-1234-5678-90abcdef1234',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing verification ID', () => {
      const result = ValidateCertificateRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});