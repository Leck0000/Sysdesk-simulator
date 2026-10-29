import { z } from 'zod';
import { describe, it, expect } from 'vitest';

import { authApi } from './api';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// authApi endpoint existence tests
// ---------------------------------------------------------------------------

describe('authApi endpoint existence', () => {
  it('has loginMutation endpoint', () => {
    expect(authApi.endpoints.loginMutation).toBeDefined();
    expect(typeof authApi.endpoints.loginMutation.initiate).toBe('function');
  });

  it('has refreshMutation endpoint', () => {
    expect(authApi.endpoints.refreshMutation).toBeDefined();
    expect(typeof authApi.endpoints.refreshMutation.initiate).toBe('function');
  });

  it('has revokeMutation endpoint', () => {
    expect(authApi.endpoints.revokeMutation).toBeDefined();
    expect(typeof authApi.endpoints.revokeMutation.initiate).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Zod request schema validation tests
// ---------------------------------------------------------------------------

describe('Zod request schema validation', () => {
  const LoginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const RefreshRequestSchema = z.object({
    refreshToken: z.string().min(1),
  });

  const RevokeRequestSchema = z.object({
    refreshToken: z.string().min(1),
  });

  describe('LoginRequestSchema', () => {
    it('accepts valid email and password', () => {
      const result = LoginRequestSchema.safeParse({ email: 'user@example.com', password: 'secret' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email format', () => {
      const result = LoginRequestSchema.safeParse({ email: 'not-an-email', password: 'secret' });
      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const result = LoginRequestSchema.safeParse({ email: 'user@example.com' });
      expect(result.success).toBe(false);
    });

    it('rejects empty email', () => {
      const result = LoginRequestSchema.safeParse({ email: '', password: 'secret' });
      expect(result.success).toBe(false);
    });
  });

  describe('RefreshRequestSchema', () => {
    it('accepts valid refresh token', () => {
      const result = RefreshRequestSchema.safeParse({ refreshToken: 'valid-refresh-token' });
      expect(result.success).toBe(true);
    });

    it('rejects missing refresh token', () => {
      const result = RefreshRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty refresh token', () => {
      const result = RefreshRequestSchema.safeParse({ refreshToken: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('RevokeRequestSchema', () => {
    it('accepts valid refresh token', () => {
      const result = RevokeRequestSchema.safeParse({ refreshToken: 'valid-refresh-token' });
      expect(result.success).toBe(true);
    });

    it('rejects missing refresh token', () => {
      const result = RevokeRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty refresh token', () => {
      const result = RevokeRequestSchema.safeParse({ refreshToken: '' });
      expect(result.success).toBe(false);
    });
  });
});
