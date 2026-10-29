import { describe, it, expect } from 'vitest';

import {
  certificatesApi,
  IssueCertificateRequestSchema,
  ValidateCertificateRequestSchema,
} from './api';

// ---------------------------------------------------------------------------
// Certificates API endpoint existence tests
// ---------------------------------------------------------------------------

describe('certificatesApi endpoint existence', () => {
  it('has listCertificates query endpoint', () => {
    expect(certificatesApi.endpoints.listCertificates).toBeDefined();
    expect(typeof certificatesApi.endpoints.listCertificates.initiate).toBe('function');
  });

  it('has getCertificate query endpoint', () => {
    expect(certificatesApi.endpoints.getCertificate).toBeDefined();
    expect(typeof certificatesApi.endpoints.getCertificate.initiate).toBe('function');
  });

  it('has issueCertificate mutation endpoint', () => {
    expect(certificatesApi.endpoints.issueCertificate).toBeDefined();
    expect(typeof certificatesApi.endpoints.issueCertificate.initiate).toBe('function');
  });

  it('has validateCertificate mutation endpoint', () => {
    expect(certificatesApi.endpoints.validateCertificate).toBeDefined();
    expect(typeof certificatesApi.endpoints.validateCertificate.initiate).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Zod request schema validation tests
// ---------------------------------------------------------------------------

describe('Zod request schema validation', () => {
  describe('IssueCertificateRequestSchema', () => {
    it('accepts valid request', () => {
      const result = IssueCertificateRequestSchema.safeParse({
        userId: 'c1e2d3b4-a5f6-4890-abcd-ef1234567890',
        labId: 'a1e2d3b4-a5f6-4890-abcd-ef1234567890',
        ticketId: 'b1234567-ef90-4234-8678-90abcdef1234',
        issuedBy: 'd1234567-ef90-4234-8678-90abcdef1234',
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
        verificationId: 'e1234567-ef90-4234-8678-90abcdef1234',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing verification ID', () => {
      const result = ValidateCertificateRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});