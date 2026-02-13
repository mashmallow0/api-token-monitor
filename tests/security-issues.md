# API Token Monitor v2 - Security Issues Report

**Report Date:** 2025-02-13  
**Application Version:** 2.0.0  
**Classification:** CONFIDENTIAL  

---

## Executive Summary

This report documents security vulnerabilities found during comprehensive testing of the API Token Monitor v2 application. **2 Critical and 5 Medium/High severity issues** were identified that should be addressed before production deployment.

### Risk Rating Matrix

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 2 | Open |
| 🟠 High | 2 | Open |
| 🟡 Medium | 3 | Open |
| 🟢 Low | 2 | Open |

### Immediate Actions Required
1. **CRITICAL:** Fix timing attack vulnerability in token verification
2. **CRITICAL:** Resolve Argon2id documentation mismatch
3. **HIGH:** Implement token expiration validation
4. **HIGH:** Implement persistent encrypted storage

---

## 🔴 Critical Severity Issues

### SEC-001: Timing Attack on Token Verification (CRITICAL-002)

| Field | Value |
|-------|-------|
| **ID** | SEC-001 / CRITICAL-002 |
| **Severity** | 🔴 Critical |
| **Category** | Cryptographic Implementation |
| **CWE** | CWE-208: Observable Timing Discrepancy |
| **CVSS 3.1** | 5.9 (Medium) - CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N |

#### Description
The `verifyToken()` function in `/src/utils/crypto.ts` uses direct string comparison (`===`) when checking the admin token. This creates a timing side-channel that allows attackers to guess the admin token character by character by measuring response times.

#### Vulnerable Code
```typescript
// File: /src/utils/crypto.ts, Lines 70-73
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  try {
    // Check against environment variable hash (for admin)
    const adminHash = import.meta.env.VITE_ADMIN_TOKEN_HASH;
    if (adminHash && token === adminHash) {  // ❌ VULNERABLE
      return true;
    }
    // ... rest of function
  }
}
```

#### Attack Scenario
```
1. Attacker sends token "a" - measures response time (t1)
2. Attacker sends token "A" - measures response time (t2)
3. If t2 > t1, first character of admin token might be "A"
4. Attacker sends "Aa", "Ab", "Ac"... to find second character
5. Repeat until full token is recovered (O(n*m) where n=token length, m=charset)
```

#### Proof of Concept
```javascript
// Timing attack PoC (conceptual)
async function timingAttack() {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
  let recoveredToken = '';
  
  while (recoveredToken.length < 32) {
    let bestChar = '';
    let bestTime = 0;
    
    for (const char of charset) {
      const testToken = recoveredToken + char;
      const times = [];
      
      // Multiple measurements for accuracy
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await fetch('/api/login', {
          method: 'POST',
          body: JSON.stringify({ token: testToken })
        });
        times.push(performance.now() - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      if (avgTime > bestTime) {
        bestTime = avgTime;
        bestChar = char;
      }
    }
    
    recoveredToken += bestChar;
    console.log(`Recovered: ${recoveredToken}`);
  }
  
  return recoveredToken;
}
```

#### Impact
- **Confidentiality:** High - Admin token can be recovered
- **Integrity:** None direct
- **Availability:** None direct
- **Access:** Full admin access if token recovered

#### Remediation
```typescript
// Constant-time comparison implementation
function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  
  if (aBytes.length !== bBytes.length) {
    // Still do comparison to avoid leaking length info
    // Compare against empty array of same length
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];  // XOR, always executes
  }
  
  return result === 0;
}

// Apply in verifyToken
if (adminHash && constantTimeEqual(token, adminHash)) {
  return true;
}
```

#### Verification
After fix, all token comparisons should take identical time regardless of:
- Token length matching
- Number of matching prefix characters
- Token validity

---

### SEC-002: Argon2id Documentation Mismatch (CRITICAL-001)

| Field | Value |
|-------|-------|
| **ID** | SEC-002 / CRITICAL-001 |
| **Severity** | 🔴 Critical (Documentation/Trust) |
| **Category** | Cryptographic Implementation / Documentation |
| **CWE** | CWE-656: Reliance on Security Through Obscurity |
| **CVSS 3.1** | 4.3 (Medium) - CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N |

#### Description
The codebase documents and comments claim Argon2id hashing is used with "64MB memory, 3 iterations", but the actual implementation uses PBKDF2-SHA256 with 100,000 iterations. This is a security documentation mismatch that could lead to:
- False security assumptions
- Compliance audit failures
- Incorrect threat modeling

#### Evidence

**Documented (Comments):**
```typescript
// Argon2id hashing for tokens (Memory: 64MB, Iterations: 3)
export async function hashToken(token: string): Promise<string> {
```

**Actual Implementation:**
```typescript
export async function hashToken(token: string): Promise<string> {
  // ...
  const hashBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },  // PBKDF2!
    baseKey,
    256
  );
  return `$pbkdf2$sha256$100000$${saltHex}$${hashHex}`;  // Clearly PBKDF2
}
```

**Package.json dependency (unused):**
```json
"argon2-browser": "^1.18.0"  // Listed but never imported/used
```

#### Security Impact

| Aspect | Argon2id (Documented) | PBKDF2 (Actual) |
|--------|----------------------|-----------------|
| Memory Hard | ✅ Yes (64MB) | ❌ No |
| GPU Resistance | ✅ High | 🟡 Moderate |
| ASIC Resistance | ✅ High | ❌ Low |
| Parallelization | ✅ Configurable | 🟡 Limited |

**Risk:** Attackers with GPU/ASIC capabilities have significant advantage against PBKDF2 vs Argon2id.

#### Remediation Options

**Option 1: Implement Actual Argon2id (Recommended)**
```typescript
import * as argon2 from 'argon2-browser';

export async function hashToken(token: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const result = await argon2.hash({
    pass: token,
    salt: salt,
    time: 3,           // 3 iterations
    mem: 65536,        // 64 MB
    parallelism: 4,    // 4 parallel threads
    hashLen: 32,
    type: argon2.ArgonType.Argon2id
  });
  
  return result.encoded;
}

export async function verifyToken(token: string, hash: string): Promise<boolean> {
  try {
    await argon2.verify({ pass: token, encoded: hash });
    return true;
  } catch {
    return false;
  }
}
```

**Option 2: Update Documentation (If PBKDF2 is intentional)**
```typescript
// PBKDF2-SHA256 hashing for tokens (100,000 iterations)
// Note: Consider migrating to Argon2id for improved GPU/ASIC resistance
export async function hashToken(token: string): Promise<string> {
```

Update all documentation:
- README.md
- PROJECT.md
- Type definitions
- Security review reports

#### Verification
```typescript
// Test to verify Argon2id is actually used
const hash = await hashToken('test-token');
console.assert(hash.startsWith('$argon2id$'), 'Must use Argon2id');
```

---

## 🟠 High Severity Issues

### SEC-003: Token Expiration Not Enforced

| Field | Value |
|-------|-------|
| **ID** | SEC-003 / HIGH-001 |
| **Severity** | 🟠 High |
| **Category** | Authentication / Authorization |
| **CWE** | CWE-613: Insufficient Session Expiration |
| **CVSS 3.1** | 6.5 (Medium) - CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N |

#### Description
The Admin panel allows creating tokens with expiration dates, but the authentication system never validates these expiration dates. Expired tokens continue to authenticate successfully.

#### Vulnerable Flow
```
[Admin Panel] --creates--> [Token with expiresAt: "2025-02-01"]
                                    |
                                    v
[User Login] ----uses----> [Token after expiration date]
                                    |
                                    v
[Auth System] ---->?    [No expiration check!]
                                    |
                                    v
                              [Access Granted] ❌
```

#### Vulnerable Code
```typescript
// File: /src/hooks/useAuth.ts
const login = useCallback(async (inputToken: string): Promise<boolean> => {
  const tokenHash = await hashToken(inputToken);
  const userData = await findUserByTokenHash(tokenHash);

  if (userData) {
    // ❌ NO EXPIRATION CHECK
    setIsAuthenticated(true);
    setUser(userData);
    // ...
    return true;
  }
  // ...
}, []);
```

#### Impact
- Expired tokens remain valid indefinitely
- No way to revoke compromised tokens
- Violates principle of least privilege over time

#### Remediation
```typescript
const login = useCallback(async (inputToken: string): Promise<boolean> => {
  try {
    const tokenHash = await hashToken(inputToken);
    const userData = await findUserByTokenHash(tokenHash);

    if (userData) {
      // Check token expiration
      if (userData.expiresAt && new Date(userData.expiresAt) < new Date()) {
        logAuditEvent('LOGIN_REJECTED', { 
          reason: 'Token expired', 
          uuid: userData.uuid,
          expiredAt: userData.expiresAt 
        });
        return false;
      }
      
      // Check if token has been explicitly revoked
      if (userData.status === 'revoked') {
        logAuditEvent('LOGIN_REJECTED', { 
          reason: 'Token revoked', 
          uuid: userData.uuid 
        });
        return false;
      }
      
      setIsAuthenticated(true);
      setUser(userData);
      localStorage.setItem('auth_token', inputToken);
      logAuditEvent('LOGIN_SUCCESS', { uuid: userData.uuid });
      return true;
    }
    // ...
  }
}, []);
```

---

### SEC-004: In-Memory Storage (Data Loss)

| Field | Value |
|-------|-------|
| **ID** | SEC-004 / HIGH-002 |
| **Severity** | 🟠 High (Functionality/Security) |
| **Category** | Data Persistence |
| **CWE** | CWE-522: Insufficiently Protected Credentials |
| **CVSS 3.1** | 5.3 (Medium) - CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N |

#### Description
User data, API keys, and authentication tokens are stored in a JavaScript Map that is lost when the page refreshes. This:
1. Makes the application unusable for real use
2. Could lead to users storing tokens in unsafe ways (clipboard, text files)
3. All encrypted API keys are lost on refresh

#### Current Implementation
```typescript
// File: /src/utils/storage.ts
const storage = new Map<string, string>();  // ❌ Lost on refresh
```

#### Remediation
Implement encrypted localStorage persistence:
```typescript
const STORAGE_KEY = 'api_token_monitor_v2';
const ENCRYPTION_KEY = 'derive-from-user-password'; // Or secure master key

// Save to persistent storage
async function persistStorage(): Promise<void> {
  const data = Object.fromEntries(storage);
  const jsonData = JSON.stringify(data);
  const encrypted = await encryptStorageData(jsonData);
  localStorage.setItem(STORAGE_KEY, encrypted);
}

// Load from persistent storage
async function loadPersistedStorage(): Promise<void> {
  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (encrypted) {
    try {
      const jsonData = await decryptStorageData(encrypted);
      const data = JSON.parse(jsonData);
      for (const [key, value] of Object.entries(data)) {
        storage.set(key, value as string);
      }
    } catch (error) {
      console.error('Failed to load storage:', error);
      // Clear corrupted storage
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

// Auto-save on changes
const originalSet = storage.set.bind(storage);
storage.set = (key: string, value: string) => {
  originalSet(key, value);
  persistStorage(); // Debounced in production
  return storage;
};
```

---

## 🟡 Medium Severity Issues

### SEC-005: Insufficient PBKDF2 Iterations

| Field | Value |
|-------|-------|
| **ID** | SEC-005 / MED-001 |
| **Severity** | 🟡 Medium |
| **Category** | Cryptographic Implementation |
| **CWE** | CWE-916: Use of Password Hash With Insufficient Computational Effort |

#### Description
PBKDF2 is configured with 100,000 iterations. While this was the OWASP 2023 minimum, the 2025 recommendation for SHA-256 is 600,000 iterations.

#### Current Setting
```typescript
iterations: 100000  // OWASP 2023 minimum
```

#### Recommended Setting
```typescript
iterations: 600000  // OWASP 2025 recommendation
```

#### Impact
Lower iteration count reduces the time required for brute-force attacks.

---

### SEC-006: Permissions Not Enforced

| Field | Value |
|-------|-------|
| **ID** | SEC-006 / MED-003 |
| **Severity** | 🟡 Medium |
| **Category** | Authorization |
| **CWE** | CWE-285: Improper Authorization |

#### Description
The permission system allows setting granular permissions (read:dashboard, modify:settings, etc.) but these are never validated during operations. Any authenticated user can perform any action.

#### Current Flow
```typescript
// Permissions are set but never checked
const [permissions, setPermissions] = useState({
  readDashboard: true,
  modifySettings: false,  // ❌ Not enforced
  manageProviders: false, // ❌ Not enforced
  adminAccess: false,     // ❌ Only this partially checked
});
```

#### Remediation
```typescript
// Permission hook
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  return user?.permissions?.includes(permission) || user?.role === 'admin';
}

// Use in components
function Settings() {
  const canModifySettings = usePermission('modify:settings');
  
  return (
    <button 
      onClick={saveSettings}
      disabled={!canModifySettings}
    >
      Save
    </button>
  );
}
```

---

### SEC-007: Missing CSP Headers

| Field | Value |
|-------|-------|
| **ID** | SEC-007 |
| **Severity** | 🟡 Medium |
| **Category** | Security Headers |
| **CWE** | CWE-693: Protection Mechanism Failure |

#### Description
No Content Security Policy is configured, leaving the application vulnerable to XSS if input sanitization fails.

#### Remediation
Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           script-src 'self' 'unsafe-inline'; 
           style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
           font-src 'self' https://fonts.gstatic.com; 
           connect-src 'self' https://api.openai.com https://api.anthropic.com;">
```

---

## 🟢 Low Severity Issues

### SEC-008: No Session Timeout

| Field | Value |
|-------|-------|
| **ID** | SEC-008 / MED-002 |
| **Severity** | 🟢 Low |
| **Category** | Session Management |
| **CWE** | CWE-613: Insufficient Session Expiration |

#### Description
Sessions never expire automatically. Users remain logged in indefinitely.

#### Remediation
```typescript
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

useEffect(() => {
  const updateActivity = () => {
    sessionStorage.setItem('last_activity', Date.now().toString());
  };
  
  window.addEventListener('mousemove', updateActivity);
  window.addEventListener('keypress', updateActivity);
  
  const checkTimeout = setInterval(() => {
    const lastActivity = parseInt(sessionStorage.getItem('last_activity') || '0');
    if (Date.now() - lastActivity > SESSION_TIMEOUT) {
      logout();
    }
  }, 60000);
  
  return () => {
    window.removeEventListener('mousemove', updateActivity);
    window.removeEventListener('keypress', updateActivity);
    clearInterval(checkTimeout);
  };
}, [logout]);
```

---

### SEC-009: Lockout Duration May Be Aggressive

| Field | Value |
|-------|-------|
| **ID** | SEC-009 |
| **Severity** | 🟢 Low |
| **Category** | Authentication |
| **CWE** | CWE-307: Improper Restriction of Excessive Authentication Attempts |

#### Description
The 1-hour lockout after 5 failed attempts may be overly aggressive for legitimate users.

#### Current Setting
```typescript
const LOCKOUT_DURATION = 60 * 60 * 1000; // 1 hour
```

#### Alternative: Exponential Backoff
```typescript
function calculateLockout(attempts: number): number {
  // Exponential backoff: 1min, 2min, 4min, 8min, 16min...
  return Math.min(60 * 1000 * Math.pow(2, attempts - 5), 60 * 60 * 1000);
}
```

---

## Compliance Mapping

| Requirement | Standard | Status |
|-------------|----------|--------|
| Timing-safe comparisons | OWASP ASVS 6.2.5 | ❌ FAIL |
| Memory-hard password hashing | OWASP ASVS 6.2.4 | ⚠️ PARTIAL |
| Session timeout | OWASP ASVS 3.7.1 | ❌ FAIL |
| Principle of least privilege | OWASP ASVS 4.1.1 | ❌ FAIL |
| CSP headers | OWASP ASVS 14.4.3 | ❌ FAIL |
| Token expiration | OWASP ASVS 3.7.2 | ❌ FAIL |
| Input validation | OWASP ASVS 5.1.1 | ✅ PASS |
| XSS prevention | OWASP ASVS 5.3.1 | ✅ PASS |
| Rate limiting | OWASP ASVS 11.1.1 | ✅ PASS |

---

## Remediation Timeline

| Issue | Severity | Effort | Priority | Target Date |
|-------|----------|--------|----------|-------------|
| SEC-001: Timing Attack | Critical | Low | P0 | Immediate |
| SEC-002: Argon2id | Critical | Medium | P0 | 3 days |
| SEC-003: Token Expiration | High | Low | P1 | 1 week |
| SEC-004: Data Persistence | High | Medium | P1 | 1 week |
| SEC-005: PBKDF2 Iterations | Medium | Low | P2 | 2 weeks |
| SEC-006: Permissions | Medium | Medium | P2 | 2 weeks |
| SEC-007: CSP Headers | Medium | Low | P2 | 2 weeks |
| SEC-008: Session Timeout | Low | Low | P3 | 1 month |
| SEC-009: Lockout | Low | Low | P3 | 1 month |

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Security Review | QA Subagent | 2025-02-13 | ⚠️ NOT APPROVED |

**Note:** Application should NOT be deployed to production until Critical and High severity issues are resolved.

---

*Report Generated: 2025-02-13*  
*Classification: CONFIDENTIAL*
