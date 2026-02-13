// File operations with locking using localStorage for persistence
import type { UserData } from '../types';
import { generateUUID } from './crypto';

// Simulated file locking using in-memory locks
const locks = new Map<string, Promise<void>>();

async function acquireLock(key: string): Promise<() => void> {
  while (locks.has(key)) {
    await locks.get(key);
  }

  let release: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(key, lockPromise);

  return () => {
    locks.delete(key);
    release!();
  };
}

const STORAGE_PREFIX = 'api_token_monitor_v2_';
const USERS_KEY = `${STORAGE_PREFIX}users_index`;

// Get users index from localStorage
function getUsersIndex(): string[] {
  try {
    const index = localStorage.getItem(USERS_KEY);
    return index ? JSON.parse(index) : [];
  } catch {
    return [];
  }
}

// Save users index to localStorage
function saveUsersIndex(index: string[]): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(index));
  } catch (e) {
    console.error('Failed to save users index:', e);
  }
}

// Validate UUID format to prevent path traversal
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Get storage key for user
function getUserKey(uuid: string): string {
  return `${STORAGE_PREFIX}user_${uuid}`;
}

export async function saveUserData(userData: UserData): Promise<void> {
  const lockKey = `user:${userData.uuid}`;
  const release = await acquireLock(lockKey);

  try {
    if (!isValidUUID(userData.uuid)) {
      throw new Error('Invalid UUID format');
    }

    // Save to localStorage
    const key = getUserKey(userData.uuid);
    localStorage.setItem(key, JSON.stringify(userData));
    
    // Update index
    const index = getUsersIndex();
    if (!index.includes(userData.uuid)) {
      index.push(userData.uuid);
      saveUsersIndex(index);
    }
  } finally {
    release();
  }
}

export async function loadUserData(uuid: string): Promise<UserData | null> {
  const lockKey = `user:${uuid}`;
  const release = await acquireLock(lockKey);

  try {
    if (!isValidUUID(uuid)) {
      throw new Error('Invalid UUID format');
    }

    const key = getUserKey(uuid);
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    return JSON.parse(data) as UserData;
  } finally {
    release();
  }
}

export async function findUserByTokenHash(tokenHash: string): Promise<UserData | null> {
  const release = await acquireLock('user:search');

  try {
    const index = getUsersIndex();
    
    for (const uuid of index) {
      const key = getUserKey(uuid);
      const data = localStorage.getItem(key);
      if (data) {
        const user = JSON.parse(data) as UserData;
        if (user.tokenHash === tokenHash) {
          return user;
        }
      }
    }
    return null;
  } finally {
    release();
  }
}

export async function createUser(tokenHash: string, role: string = 'user'): Promise<UserData> {
  const uuid = generateUUID();
  const now = new Date().toISOString();

  const userData: UserData = {
    uuid,
    tokenHash,
    apiKeys: [],
    createdAt: now,
    lastAccess: now,
    role: role as 'user' | 'manager' | 'admin',
    permissions: ['read:dashboard']
  };

  await saveUserData(userData);
  return userData;
}

export async function updateUser(userData: UserData): Promise<void> {
  userData.lastAccess = new Date().toISOString();
  await saveUserData(userData);
}

export async function deleteUser(uuid: string): Promise<boolean> {
  const lockKey = `user:${uuid}`;
  const release = await acquireLock(lockKey);

  try {
    if (!isValidUUID(uuid)) {
      throw new Error('Invalid UUID format');
    }

    const key = getUserKey(uuid);
    localStorage.removeItem(key);
    
    // Update index
    const index = getUsersIndex();
    const newIndex = index.filter(id => id !== uuid);
    saveUsersIndex(newIndex);
    
    return true;
  } finally {
    release();
  }
}

export async function listAllUsers(): Promise<UserData[]> {
  const release = await acquireLock('user:list');

  try {
    const index = getUsersIndex();
    const users: UserData[] = [];
    
    for (const uuid of index) {
      const key = getUserKey(uuid);
      const data = localStorage.getItem(key);
      if (data) {
        users.push(JSON.parse(data) as UserData);
      }
    }
    
    return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } finally {
    release();
  }
}

// Clear all data (for testing/admin)
export async function clearAllData(): Promise<void> {
  const release = await acquireLock('global:clear');
  
  try {
    const index = getUsersIndex();
    for (const uuid of index) {
      localStorage.removeItem(getUserKey(uuid));
    }
    localStorage.removeItem(USERS_KEY);
  } finally {
    release();
  }
}
