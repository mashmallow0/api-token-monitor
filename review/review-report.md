# API Token Monitor v2 - Security & Code Quality Review Report

**Date:** 2025-02-13  
**Reviewer:** Senior Security Review  
**Project:** /root/.openclaw/workspace/projects/api-token-monitor-v2/

---

## Security Checklist Results

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Web Crypto API used (not CryptoJS) | ✅ **PASS** | Uses `crypto.subtle` throughout (`/src/utils/crypto.ts`) |
| 2 | AES-256-GCM used (not AES-CBC) | ✅ **PASS** | Correctly uses `AES-GCM` with 256-bit keys |
| 3 | Argon2id hashing implemented | ⚠️ **PARTIAL** | Claims Argon2id but uses PBKDF2-SHA256 (100k iterations). See CRITICAL-001 |
| 4 | Rate limiting with 5 attempts/15min | ✅ **PASS** | Correctly implemented in `/src/utils/auth.ts` and `/src/hooks/useRateLimit.ts` |
| 5 | Admin token in env (not hardcoded) | ✅ **PASS** | Uses `import.meta.env.VITE_ADMIN_TOKEN_HASH` |
| 6 | File locking implemented | ✅ **PASS** | In-memory locking with `acquireLock()` in `/src/utils/storage.ts` |
| 7 | Input validation with Zod | ✅ **PASS** | Zod schemas defined for tokens, API keys, and settings |
| 8 | UUID-based filenames (not token hash) | ✅ **PASS** | `generateUUID()` used for filenames, hash stored separately |
| 9 | No XSS vulnerabilities | ✅ **PASS** | `sanitizeInput()` function implemented and used in Login.tsx |
| 10 | Error handling doesn't expose sensitive info | ✅ **PASS** | Generic error messages used; no stack traces or internals leaked |

**Overall Score:** 9.5/10 (1 partial, 0 failures on critical requirements)

---

## Critical Issues (Must Fix Before QA)

### 🔴 CRITICAL-001: Argon2id Not Actually Implemented
**File:** `/src/utils/crypto.ts`  
**Issue:** The code claims to implement Argon2id in comments and the `hashToken()` function name, but it actually uses PBKDF2-SHA256. The type definition in `/src/types/index.ts` also incorrectly labels `tokenHash` as "Argon2id hash".

**Current Code:**
```typescript
// Argon2id hashing for tokens (Memory: 64MB, Iterations: 3)
// Note: argon2-browser requires WASM - using Web Crypto API as fallback
export async function hashToken(token: string): Promise<string> {
  // ... uses PBKDF2, not Argon2id
}
```

**Impact:** 
- Misleading documentation/comments
- PBKDF2 is less resistant to GPU/ASIC attacks compared to Argon2id
- Security claims don't match implementation

**Recommendation:** 
1. Either implement actual Argon2id (using `argon2-browser` package)
2. OR update all comments and type definitions to accurately reflect PBKDF2 usage
3. Consider increasing PBKDF2 iterations to 600k+ (OWASP recommendation for 2025)

---

### 🔴 CRITICAL-002: Timing Attack Vulnerability in verifyToken
**File:** `/src/utils/crypto.ts` (lines 70-73)  
**Issue:** Direct string comparison used for admin token verification, vulnerable to timing attacks.

**Current Code:**
```typescript
const adminHash = import.meta.env.VITE_ADMIN_TOKEN_HASH;
if (adminHash && token === adminHash) {  // ❌ NOT timing-safe
  return true;
}
```

**Impact:** An attacker could use timing analysis to guess the admin token character by character.

**Recommendation:** Replace with constant-time comparison:
```typescript
if (adminHash && await timingSafeEqual(token, adminHash)) {
  return true;
}
```

Note: The `verifyAdminToken()` function in `/src/utils/auth.ts` does implement constant-time comparison correctly - this logic should be consolidated.

---

### 🟡 HIGH-001: No Token Expiration Validation
**File:** `/src/utils/auth.ts`, `/src/components/Admin.tsx`  
**Issue:** Tokens can be created with expiration dates, but there's no validation during authentication to check if a token has expired.

**Evidence:**
- Admin.tsx creates users with `expiresAt` field
- No expiration check in login flow or token verification

**Recommendation:** Add expiration check in authentication flow:
```typescript
if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
  logAuditEvent('TOKEN_EXPIRED', { uuid: user.uuid });
  return false;
}
```

---

### 🟡 HIGH-002: In-Memory Storage Not Persistent
**File:** `/src/utils/storage.ts`  
**Issue:** Uses in-memory Map for storage which is lost on page refresh. This is noted as "for browser environment" but could lead to data loss.

**Impact:** All user data, tokens, and API keys are lost on browser refresh.

**Recommendation:** Implement localStorage/sessionStorage with encryption for persistence, or document this as intentional for the demo/PoC phase.

---

## Medium Priority Issues

### 🟠 MED-001: Insufficient PBKDF2 Iterations
**File:** `/src/utils/crypto.ts`  
**Issue:** Using 100,000 iterations for PBKDF2. OWASP 2025 recommendations suggest 600,000+ iterations for SHA-256.

**Recommendation:** Increase to at least 600,000 iterations, or migrate to Argon2id.

---

### 🟠 MED-002: Lockout Duration May Be Too Long
**File:** `/src/utils/auth.ts`  
**Issue:** 1-hour lockout after 5 failed attempts may be overly aggressive for legitimate users.

**Recommendation:** Consider implementing exponential backoff instead of fixed 1-hour lockout.

---

### 🟠 MED-003: No Maximum Token Length Enforcement
**File:** `/src/utils/auth.ts`  
**Issue:** Token schema allows up to 128 characters, but `verifyAdminToken` compares byte lengths directly without normalization.

**Recommendation:** Ensure consistent encoding (UTF-8) when comparing tokens.

---

## Code Quality Observations

### Positive Findings
1. ✅ Good separation of concerns (crypto, storage, auth in separate modules)
2. ✅ Proper use of TypeScript types throughout
3. ✅ Audit logging implemented
4. ✅ Rate limiting is comprehensive with UI feedback
5. ✅ Input sanitization present for XSS prevention
6. ✅ UUID validation prevents path traversal attacks

### Suggestions
1. Add unit tests for cryptographic functions
2. Consider adding a secrets rotation mechanism
3. Document the threat model and security assumptions
4. Add Content Security Policy headers (if not already present)

---

## Files Reviewed
- `/src/utils/crypto.ts` - Web Crypto API + Argon2id implementation
- `/src/utils/storage.ts` - File storage with locking
- `/src/utils/auth.ts` - Authentication logic
- `/src/hooks/useRateLimit.ts` - Rate limiting
- `/src/components/Login.tsx` - Login component
- `/src/components/Admin.tsx` - Token generation
- `/src/types/index.ts` - Type definitions

---

## Summary

The API Token Monitor v2 implementation shows **strong security fundamentals** with proper use of modern Web Crypto APIs, rate limiting, input validation, and XSS protection. The code is well-structured and follows good TypeScript practices.

**However, two critical issues must be addressed before QA testing:**
1. Fix the timing attack vulnerability in `verifyToken()`
2. Correct the misleading Argon2id claims (either implement Argon2id or update documentation)

Once these are resolved, the codebase should be ready for QA testing.
