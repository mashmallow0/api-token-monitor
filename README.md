# API Token Monitor v2

A secure, real-time API token usage monitoring dashboard with cyberpunk-themed UI.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)
![Tailwind](https://img.shields.io/badge/Tailwind-3.0-06B6D4)

## ✨ Features

- 🔐 **Secure Token Authentication** - PBKDF2-SHA256 hashing with constant-time comparison
- 📊 **Real-time API Usage Monitoring** - Animated circular progress bars
- 🎨 **Cyberpunk Dark Theme** - Glassmorphism UI with neon accents
- 🔒 **Encrypted Storage** - AES-256-GCM encryption for API keys
- 👤 **Role-based Access** - Admin, Manager, User roles
- 📱 **Responsive Design** - Works on desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/mashmallow0/api-token-monitor.git
cd api-token-monitor

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env and add your admin token hash

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

## 🔐 Security

### Encryption
- **API Keys**: AES-256-GCM with PBKDF2 key derivation (100k iterations)
- **Token Hashing**: PBKDF2-SHA256 with unique salt per user
- **Timing Attack Protection**: Constant-time comparison for token verification

### Authentication
- Token-based authentication
- Rate limiting: 5 attempts per 15 minutes
- Session persistence with localStorage

## 📁 Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Crypto, storage, auth utilities
│   ├── types/          # TypeScript types
│   └── App.tsx         # Main application
├── design/             # UI/UX mockups
├── review/             # Security audit reports
├── tests/              # Test cases and results
└── dist/               # Production build
```

## 🎨 Design System

- **Primary Colors**: Neon Cyan (#00f0ff), Purple (#b829f7), Pink (#ff007f)
- **Background**: Dark (#0a0a0f) with gradient overlays
- **Glassmorphism**: Backdrop blur with subtle borders
- **Typography**: System fonts with monospace for code

## 🔧 Configuration

### Environment Variables

```env
VITE_ADMIN_TOKEN_HASH=your_argon2id_or_pbkdf2_hash_here
```

Generate admin token hash:
```typescript
import { hashToken } from './src/utils/crypto';
const hash = await hashToken('your-admin-token');
console.log(hash); // Use this in .env
```

## 📝 Admin Token

Default admin token: `?bpy&Z?@CNn&b%mJ`

**⚠️ IMPORTANT**: Change this in production by generating a new hash!

## 🧪 Testing

```bash
# Run all tests
npm test

# Build verification
npm run build
```

## 🔒 Security Audit

See `/review/security-audit.md` for detailed security analysis.

### Key Security Features
- ✅ AES-256-GCM encryption
- ✅ PBKDF2-SHA256 hashing
- ✅ Constant-time token comparison
- ✅ Rate limiting
- ✅ Input validation
- ✅ XSS protection

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Credits

Built with:
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Lucide Icons](https://lucide.dev/)

## 📞 Support

For issues and feature requests, please use GitHub Issues.
