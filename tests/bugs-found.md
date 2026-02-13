# API Token Monitor v2 - Bugs Found

**Report Date:** 2025-02-13  
**Application Version:** 2.0.0  
**Total Bugs Found:** 11  
**Critical:** 2 | **High:** 4 | **Medium:** 3 | **Low:** 2

---

## 🔴 Critical Severity

### BUG-001: Timing Attack Vulnerability in Token Verification

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-001 |
| **Severity** | 🔴 CRITICAL |
| **Category** | Security |
| **Status** | Open |

#### Description
The `verifyToken()` function in `/src/utils/crypto.ts` uses direct string comparison (`===`) when checking if a token matches the admin hash. This creates a timing attack vulnerability where an attacker can measure response times to guess the admin token character by character.

#### Location
```typescript
// File: /src/utils/crypto.ts, Lines 70-73
const adminHash = import.meta.env.VITE_ADMIN_TOKEN_HASH;
if (adminHash && token === adminHash) {  // ❌ NOT timing-safe
  return true;
}
```

#### Reproduction Steps
1. Set up a timing measurement script
2. Send login requests with tokens that progressively match the admin token prefix
3. Measure response times for each request
4. Observe that responses with matching prefixes take slightly longer
5. Use timing differences to reconstruct the admin token

#### Expected Behavior
All token comparison operations should use constant-time comparison algorithms to prevent timing analysis.

#### Actual Behavior
Direct string comparison allows timing analysis attacks.

#### Impact
- **CVSS Score:** 5.9 (Medium) - Information Disclosure
- An attacker could determine the admin token through statistical timing analysis
- Once admin token is known, full system compromise possible

#### Suggested Fix
```typescript
// Use crypto.subtle for constant-time comparison
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  
  if (aBytes.length !== bBytes.length) {
    return false;
  }
  
  return await crypto.subtle.verify(
    'HMAC',
    await crypto.subtle.importKey('raw', new Uint8Array(32), 'HMAC', false, ['verify']),
    aBytes,
    bBytes
  );
}

// Or simpler constant-time comparison:
function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  
  if (aBytes.length !== bBytes.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}
```

#### Related Issue
- CRITICAL-002 in security review
- SEC-001 in test results

---

### BUG-002: Argon2id Documentation Mismatch

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-002 |
| **Severity** | 🔴 CRITICAL (Documentation) |
| **Category** | Security / Documentation |
| **Status** | Open |

#### Description
The codebase claims to use Argon2id hashing in comments, function names, and documentation, but actually implements PBKDF2-SHA256. This is misleading and could lead to security assumptions that don't match reality.

#### Location
```typescript
// File: /src/utils/crypto.ts, Lines 42-62
// Argon2id hashing for tokens (Memory: 64MB, Iterations: 3)
// Note: argon2-browser requires WASM - using Web Crypto API as fallback
export async function hashToken(token: string): Promise<string> {
  // ... actually uses PBKDF2, not Argon2id
  const hashBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    256
  );
  // ...
  return `$pbkdf2$sha256$100000$${saltHex}$${hashHex}`;
}
```

Also in `/src/types/index.ts`:
```typescript
tokenHash: string; // Argon2id hash  // ❌ Actually PBKDF2
```

#### Reproduction Steps
1. Review the code documentation and comments
2. Note claims of Argon2id with "64MB memory, 3 iterations"
3. Observe actual implementation uses PBKDF2-SHA256 with 100k iterations
4. Check package.json - argon2-browser listed as dependency but not used

#### Expected Behavior
Either:
- Actually implement Argon2id hashing using argon2-browser package
- OR update all documentation to accurately reflect PBKDF2 usage

#### Actual Behavior
Documentation and code comments claim Argon2id, but PBKDF2 is used.

#### Impact
- **Trust Issue:** Security claims don't match implementation
- **Compliance Risk:** Audits may fail due to documented vs actual discrepancy
- **Misconfigured Security:** Users may assume Argon2id memory-hard properties

#### Suggested Fix (Option 1 - Implement Argon2id)
```typescript
import * as argon2 from 'argon2-browser';

export async function hashToken(token: string): Promise<string> {
  const result = await argon2.hash({
    pass: token,
    salt: crypto.getRandomValues(new Uint8Array(16)),
    time: 3,
    mem: 65536,  // 64MB
    parallelism: 4,
    hashLen: 32,
    type: argon2.ArgonType.Argon2id
  });
  return result.encoded;
}
```

#### Suggested Fix (Option 2 - Update Documentation)
Update all comments, README, and type definitions to accurately reflect PBKDF2 usage:
```typescript
// PBKDF2-SHA256 hashing for tokens (100,000 iterations)
export async function hashToken(token: string): Promise<string> {
  // ... existing implementation
}
```

#### Related Issue
- CRITICAL-001 in security review
- SEC-002 in test results

---

## 🟠 High Severity

### BUG-003: Token Expiration Not Enforced

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-003 |
| **Severity** | 🟠 HIGH |
| **Category** | Authentication |
| **Status** | Open |

#### Description
Tokens can be created with expiration dates in the Admin panel, but there is no validation during login to check if a token has expired. Expired tokens continue to work indefinitely.

#### Location
```typescript
// File: /src/hooks/useAuth.ts
// Login function - no expiration check
const login = useCallback(async (inputToken: string): Promise<boolean> => {
  // ... finds user
  if (userData) {
    // ❌ No check for userData.expiresAt
    setIsAuthenticated(true);
    // ...
  }
}, []);
```

#### Reproduction Steps
1. Login as admin
2. Generate a new token with 7-day expiration
3. Wait 7 days (or manually modify stored data to past date)
4. Attempt login with the "expired" token
5. **Bug:** Login succeeds despite token being expired

#### Expected Behavior
Expired tokens should be rejected with a "Token expired" message.

#### Actual Behavior
Expired tokens continue to authenticate successfully.

#### Impact
- Revoked or expired tokens remain valid
- Security risk if tokens are compromised
- No way to enforce token lifecycle

#### Suggested Fix
```typescript
// In /src/hooks/useAuth.ts login function
const login = useCallback(async (inputToken: string): Promise<boolean> => {
  try {
    const tokenHash = await hashToken(inputToken);
    const userData = await findUserByTokenHash(tokenHash);

    if (userData) {
      // Check token expiration
      if (userData.expiresAt && new Date(userData.expiresAt) < new Date()) {
        logAuditEvent('LOGIN_FAILED', { reason: 'Token expired', uuid: userData.uuid });
        return false;
      }
      
      setIsAuthenticated(true);
      setUser(userData);
      // ...
    }
  }
}, []);
```

#### Related Issue
- HIGH-001 in security review
- AUTH-008 in test results

---

### BUG-004: Data Loss on Page Refresh

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-004 |
| **Severity** | 🟠 HIGH |
| **Category** | Data Persistence |
| **Status** | Open |

#### Description
The application uses in-memory Map for storage, which is lost when the page is refreshed. All users, API keys, and settings are permanently lost.

#### Location
```typescript
// File: /src/utils/storage.ts, Line 21
const storage = new Map<string, string>();  // ❌ In-memory only
```

#### Reproduction Steps
1. Login as admin
2. Generate a new user token
3. Add some API providers
4. Refresh the browser page
5. **Bug:** All data is gone, need to recreate everything

#### Expected Behavior
User data should persist across page refreshes using localStorage or similar.

#### Actual Behavior
All data is lost on refresh.

#### Impact
- Unusable for real-world use
- All configuration lost on every refresh
- Generated tokens become invalid

#### Suggested Fix
```typescript
// Implement localStorage-based storage with encryption
const STORAGE_KEY = 'api_token_monitor_data';

async function persistStorage(): Promise<void> {
  const data = Object.fromEntries(storage);
  const encrypted = await encryptData(JSON.stringify(data));
  localStorage.setItem(STORAGE_KEY, encrypted);
}

async function loadPersistedStorage(): Promise<void> {
  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (encrypted) {
    const data = JSON.parse(await decryptData(encrypted));
    for (const [key, value] of Object.entries(data)) {
      storage.set(key, value as string);
    }
  }
}
```

#### Related Issue
- HIGH-002 in security review
- FUNC-009 in test results

---

### BUG-005: Edit Provider Button Non-Functional

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-005 |
| **Severity** | 🟠 HIGH (Functionality) |
| **Category** | UI / Functionality |
| **Status** | Open |

#### Description
The edit (pencil) button on provider cards in the Settings page has no functionality attached. Clicking it does nothing.

#### Location
```tsx
// File: /src/components/Settings.tsx, Line ~195
<button className="action-btn" title="Edit">
  <Pencil className="w-5 h-5" />
</button>
```

#### Reproduction Steps
1. Go to Settings page
2. Click the pencil icon on any provider
3. **Bug:** Nothing happens

#### Expected Behavior
Edit modal should open allowing modification of the API key.

#### Actual Behavior
Button is present but non-functional.

#### Suggested Fix
Implement edit functionality similar to add provider modal:
```tsx
const [editingProvider, setEditingProvider] = useState<StoredProvider | null>(null);

// ...

<button 
  className="action-btn" 
  title="Edit"
  onClick={() => setEditingProvider(provider)}
>
  <Pencil className="w-5 h-5" />
</button>

// Add edit modal similar to add modal
{editingProvider && (
  <EditProviderModal 
    provider={editingProvider}
    onSave={handleEditSave}
    onClose={() => setEditingProvider(null)}
  />
)}
```

---

### BUG-006: Dashboard Usage Percentage Calculation Error

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-006 |
| **Severity** | 🟠 HIGH (Data Accuracy) |
| **Category** | UI / Data |
| **Status** | Open |

#### Description
The dashboard displays incorrect usage percentage. The mock data shows 5234/10000 usage (52.34%) but the progress circle displays 50%.

#### Location
```tsx
// File: /src/components/Dashboard.tsx, Lines 55-65
useEffect(() => {
  const used = 5234;
  const total = 10000;
  const percent = Math.round((used / total) * 100);  // Should be 52
  
  const timer = setTimeout(() => {
    setUsagePercent(percent);  // 52
    setProgress(percent);      // 52
  }, 300);
}, []);

// But initial state is:
const [usagePercent, setUsagePercent] = useState(50);  // ❌ Hardcoded 50
const [progress, setProgress] = useState(0);
```

#### Reproduction Steps
1. Login to dashboard
2. Observe the usage percentage display
3. **Bug:** Shows 50% initially, should show calculated percentage

#### Expected Behavior
Dashboard should display the correct calculated percentage (52%).

#### Actual Behavior
Initial hardcoded value of 50% is shown.

#### Suggested Fix
```tsx
// Either remove initial state default:
const [usagePercent, setUsagePercent] = useState<number | null>(null);

// And show loading state:
{usagePercent === null ? (
  <span className="loading-spinner" />
) : (
  <span className="text-5xl font-bold">{usagePercent}%</span>
)}
```

---

## 🟡 Medium Severity

### BUG-007: Mobile Responsive Design Issues

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-007 |
| **Severity** | 🟡 MEDIUM |
| **Category** | UI / Responsive |
| **Status** | Open |

#### Description
The application has responsive CSS classes defined but the sidebar doesn't properly collapse on mobile, and there's no hamburger menu to toggle it.

#### Location
```css
/* File: /src/index.css, Lines 700-710 */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar.open {
    transform: translateX(0);
  }
  /* ❌ No hamburger button to toggle .open class */
}
```

#### Reproduction Steps
1. Open app on mobile device or resize browser to < 768px
2. **Bug:** Sidebar hidden but no way to open it, content cut off

#### Expected Behavior
Hamburger menu should allow toggling sidebar visibility on mobile.

#### Suggested Fix
Add a mobile header with hamburger button:
```tsx
// Add to each page component
<header className="mobile-header md:hidden">
  <button onClick={() => setSidebarOpen(!sidebarOpen)}>
    <Menu className="w-6 h-6" />
  </button>
</header>

// Update sidebar className
<aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
```

---

### BUG-008: Permissions Not Validated

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-008 |
| **Severity** | 🟡 MEDIUM |
| **Category** | Authorization |
| **Status** | Open |

#### Description
The permission checkboxes in the Admin panel allow setting permissions, but these permissions are never actually validated or enforced anywhere in the application.

#### Location
```typescript
// File: /src/components/Admin.tsx
// Permissions are set in state but never used:
const [permissions, setPermissions] = useState({
  readDashboard: true,
  modifySettings: false,
  // ...
});

// These are passed to createUser but never checked
const newUser = await createUser(tokenHash, selectedRole);
// newUser.permissions is set but never validated
```

#### Reproduction Steps
1. Create a user without "modify:settings" permission
2. Login as that user
3. **Bug:** User can still modify settings

#### Expected Behavior
Each action should check user permissions before allowing access.

#### Suggested Fix
```typescript
// Create a permission hook
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  return user?.permissions?.includes(permission) || false;
}

// Use in components
const canModifySettings = usePermission('modify:settings');

<button disabled={!canModifySettings}>Save Settings</button>
```

---

### BUG-009: Low PBKDF2 Iteration Count

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-009 |
| **Severity** | 🟡 MEDIUM |
| **Category** | Security |
| **Status** | Open |

#### Description
PBKDF2 uses 100,000 iterations, which was the OWASP 2023 minimum. OWASP 2025 recommends 600,000+ iterations for SHA-256.

#### Location
```typescript
// File: /src/utils/crypto.ts, Lines 55-58, 88
const hashBits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },  // ❌ Low
```

#### Suggested Fix
```typescript
const PBKDF2_ITERATIONS = 600000;  // OWASP 2025 recommendation

const hashBits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
  // ...
);
```

---

## 🟢 Low Severity

### BUG-010: No Session Timeout

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-010 |
| **Severity** | 🟢 LOW |
| **Category** | Session Management |
| **Status** | Open |

#### Description
There's no automatic session timeout. Users remain logged in indefinitely until they manually logout or close the browser.

#### Suggested Fix
```typescript
// In useAuth.ts
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

useEffect(() => {
  const interval = setInterval(() => {
    const lastActivity = sessionStorage.getItem('last_activity');
    if (lastActivity && Date.now() - parseInt(lastActivity) > SESSION_TIMEOUT) {
      logout();
    }
  }, 60000);
  return () => clearInterval(interval);
}, [logout]);
```

---

### BUG-011: Missing CSP Headers

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-011 |
| **Severity** | 🟢 LOW |
| **Category** | Security Headers |
| **Status** | Open |

#### Description
No Content Security Policy headers are configured, which could allow XSS attacks if other protections fail.

#### Suggested Fix
Add CSP meta tag to index.html:
```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; 
           script-src 'self' 'unsafe-inline'; 
           style-src 'self' 'unsafe-inline'; 
           font-src 'self' data:;">
```

---

## Summary

| Severity | Count | Bug IDs |
|----------|-------|---------|
| 🔴 Critical | 2 | BUG-001, BUG-002 |
| 🟠 High | 4 | BUG-003, BUG-004, BUG-005, BUG-006 |
| 🟡 Medium | 3 | BUG-007, BUG-008, BUG-009 |
| 🟢 Low | 2 | BUG-010, BUG-011 |
| **Total** | **11** | |

### Must Fix Before Production
- BUG-001: Timing Attack (Security)
- BUG-002: Argon2id Documentation (Security/Trust)
- BUG-003: Token Expiration (Security)
- BUG-004: Data Persistence (Functionality)

### Recommended Fixes
- BUG-005: Edit Functionality (UX)
- BUG-006: Percentage Calculation (Accuracy)
- BUG-007: Mobile Responsive (UX)
- BUG-008: Permission Validation (Security)
- BUG-009: PBKDF2 Iterations (Security)

### Nice to Have
- BUG-010: Session Timeout
- BUG-011: CSP Headers

---

*Report Generated: 2025-02-13*  
*QA Engineer: Subagent*
