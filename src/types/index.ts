// Types for API Token Monitor v2

export type Page = 'dashboard' | 'settings' | 'admin';

export type NavigateFunction = (page: Page) => void;

export interface ApiKey {
  id: string;
  provider: string;
  key: string; // Encrypted
  usage: number;
  limit: number;
}

export interface UserData {
  uuid: string;
  tokenHash: string; // Argon2id hash
  apiKeys: ApiKey[];
  createdAt: string;
  lastAccess: string;
  role: 'user' | 'manager' | 'admin';
  permissions: string[];
}

export interface Provider {
  id: string;
  name: string;
  icon: string;
  color: string;
  models: string[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  provider: string;
  endpoint: string;
  status: number;
  latency: number;
}

export interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: UserData | null;
  token: string | null;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

export interface EncryptedData {
  salt: number[];
  iv: number[];
  data: number[];
}

export const PROVIDERS: Provider[] = [
  { id: 'openai', name: 'OpenAI', icon: 'openai', color: 'green', models: ['GPT-4', 'GPT-3.5', 'DALL-E', 'Whisper'] },
  { id: 'anthropic', name: 'Anthropic', icon: 'anthropic', color: 'purple', models: ['Claude 3 Opus', 'Claude 3 Sonnet', 'Claude 3 Haiku'] },
  { id: 'grok', name: 'Grok', icon: 'grok', color: 'red', models: ['Grok-2', 'Grok-2 Vision'] },
  { id: 'cohere', name: 'Cohere', icon: 'cohere', color: 'cyan', models: ['Command', 'Embed', 'Rerank'] },
];
