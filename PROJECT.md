# API Token Monitor v2 - Revised Project

## 🔐 Overview
Web application for monitoring API token usage with high-security file-based storage.
**REVISION:** Sequential workflow + Security fixes

## 📋 Workflow (Sequential)
1. **UX/UI** → Design all pages first
2. **Coding** → Implement based on design + fix security
3. **Senior-Dev** → Review security implementation
4. **QA** → Final testing

## ⚙️ Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS (dark hi-tech theme)
- **Web Crypto API** (replace CryptoJS) ⚠️
- **Argon2id** for hashing (replace SHA-256) ⚠️
- File-based storage with locking

## 🛡️ SECURITY FIXES REQUIRED
Based on audit findings:

### 🔴 Critical (Must Fix)
1. **Admin Token** - Move to environment variable, use Argon2id hash
2. **Encryption** - Use Web Crypto API AES-256-GCM (not CryptoJS)
3. **Token Hashing** - Use Argon2id with 64MB memory
4. **Rate Limiting** - 5 attempts per 15min, 1-hour lockout

### 🟠 High Priority
5. **File Locking** - Prevent race conditions
6. **Input Validation** - Sanitize all inputs
7. **XSS Prevention** - Escape output, CSP headers
8. **Path Traversal** - Validate file paths

### 🟡 Medium
9. **Audit Logging** - Log all auth attempts
10. **Error Handling** - Don't expose sensitive info

## 🎨 Design System (from UX/UI)
- Dark cyberpunk theme
- Neon cyan (#00f0ff), purple (#b829f7), pink (#ff007f)
- Glassmorphism cards
- Animated circular progress
- Responsive design

## 📄 Pages Required

### 1. Login Page
- Token input with visibility toggle
- Rate limit warning display
- Dark theme with particle effects

### 2. Dashboard
- Circular animated API usage %
- Provider cards with status
- Real-time stats
- Glassmorphism design

### 3. Settings
- **Masked API key inputs (***)**
- Add/Edit provider form
- Test connection with loading state
- Delete confirmation

### 4. Admin Panel
- Generate secure random tokens
- User list with role badges
- System status overview
- Token copy functionality

## 📁 File Structure
```
/data/
  .admin_hash          # Argon2id hash (not raw token)
  users/
    {uuid}.txt         # UUID-based (not token hash)
    
/src/
  /components/
    Login.tsx
    Dashboard.tsx
    Settings.tsx
    Admin.tsx
  /utils/
    crypto.ts          # Web Crypto API
    storage.ts         # File ops with locking
    auth.ts            # Argon2id + rate limiting
  /hooks/
    useRateLimit.ts
    useAuth.ts
```

## 📊 Data Structure (Encrypted)
```typescript
{
  "uuid": "uuid-v4-here",
  "tokenHash": "argon2id-hash",
  "apiKeys": [{
    "provider": "openai",
    "key": "encrypted-aes-gcm",
    "usage": 4500,
    "limit": 10000
  }],
  "createdAt": "...",
  "lastAccess": "..."
}
```

## ⚙️ Environment Variables
```bash
ADMIN_TOKEN_HASH=argon2id:...
ENCRYPTION_KEY=32-byte-random
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW=900000
```

## 📍 Project Location
`/root/.openclaw/workspace/projects/api-token-monitor-v2/`