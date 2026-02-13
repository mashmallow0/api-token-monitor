// Authentication utilities with rate limiting and validation
import { z } from 'zod';
import type { RateLimitState } from '../types';

// Zod schemas for validation
export const tokenSchema = z.string().min(8).max(128).regex(/^[a-zA-Z0-9_-]+$/);

export const apiKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'grok', 'cohere', 'custom']),
  key: z.string().min(10).max(256),
  usage: z.number().min(0).default(0),
  limit: z.number().min(1).default(1000)
});

export const userSettingsSchema = z.object({
  alertThreshold: z.number().min(1).max(100).default(80),
  timezone: z.string().default('UTC'),
  refreshInterval: z.string().default('30'),
  theme: z.enum(['dark', 'light', 'auto']).default('dark')
});

// Rate limiting configuration
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION = 60 * 60 * 1000; // 1 hour

// In-memory rate limiting storage
const rateLimitStore = new Map<string, RateLimitState>();

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Audit logging
const auditLogs: string[] = [];

export function logAuditEvent(event: string, details: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${event}: ${JSON.stringify(details)}`;
  auditLogs.push(logEntry);
  console.log(logEntry); // Also log to console
}

export function getAuditLogs(): string[] {
  return [...auditLogs];
}

// Rate limiting
export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const state = rateLimitStore.get(identifier);

  if (!state) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      lastAttempt: now,
      lockedUntil: null
    });
    return { allowed: true, retryAfter: 0 };
  }

  // Check if currently locked
  if (state.lockedUntil && now < state.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((state.lockedUntil - now) / 1000) };
  }

  // Reset if window has passed
  if (now - state.lastAttempt > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      lastAttempt: now,
      lockedUntil: null
    });
    return { allowed: true, retryAfter: 0 };
  }

  // Check if too many attempts
  if (state.attempts >= RATE_LIMIT_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_DURATION;
    state.lockedUntil = lockedUntil;
    state.lastAttempt = now;
    rateLimitStore.set(identifier, state);
    
    logAuditEvent('RATE_LIMIT_EXCEEDED', { identifier, attempts: state.attempts });
    return { allowed: false, retryAfter: Math.ceil(LOCKOUT_DURATION / 1000) };
  }

  // Increment attempts
  state.attempts += 1;
  state.lastAttempt = now;
  rateLimitStore.set(identifier, state);

  return { allowed: true, retryAfter: 0 };
}

export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

// Get rate limit status
export function getRateLimitStatus(identifier: string): RateLimitState | null {
  return rateLimitStore.get(identifier) || null;
}

// Token validation
export function validateTokenFormat(token: string): { valid: boolean; error?: string } {
  const result = tokenSchema.safeParse(token);
  if (!result.success) {
    return { valid: false, error: 'Invalid token format' };
  }
  return { valid: true };
}

// Admin token verification
export async function verifyAdminToken(token: string): Promise<boolean> {
  const adminHash = import.meta.env.VITE_ADMIN_TOKEN_HASH;
  if (!adminHash) {
    logAuditEvent('ADMIN_VERIFY_FAILED', { reason: 'No admin hash configured' });
    return false;
  }
  
  // Use constant-time comparison to prevent timing attacks
  return constantTimeEqual(token, adminHash);
}

// Constant-time comparison to prevent timing attacks
function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  
  if (aBytes.length !== bBytes.length) {
    // Still do comparison to avoid leaking length info
    const dummy = new Uint8Array(bBytes.length);
    let result = 0;
    for (let i = 0; i < bBytes.length; i++) {
      result |= dummy[i] ^ bBytes[i];
    }
    return result === 0 && false; // Always false for different lengths
  }
  
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}
