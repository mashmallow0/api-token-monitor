import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage for Node.js environment
const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
});

import { 
  saveUserData, 
  loadUserData, 
  deleteUser, 
  listAllUsers,
  isValidUUID 
} from '../src/utils/storage';
import type { UserData } from '../src/types';

describe('Storage Utilities', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });
  describe('isValidUUID', () => {
    it('should validate correct UUID format', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });
    
    it('should reject invalid UUID format', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('../etc/passwd')).toBe(false);
    });
  });
  
  describe('saveUserData / loadUserData', () => {
    it('should save and load user data', async () => {
      const userData: UserData = {
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        tokenHash: 'hash123',
        apiKeys: [],
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
        role: 'user',
        permissions: ['read:dashboard']
      };
      
      await saveUserData(userData);
      const loaded = await loadUserData(userData.uuid);
      
      expect(loaded).toBeDefined();
      expect(loaded?.uuid).toBe(userData.uuid);
      expect(loaded?.tokenHash).toBe(userData.tokenHash);
    });
    
    it('should return null for non-existent user', async () => {
      const loaded = await loadUserData('00000000-0000-0000-0000-000000000000');
      expect(loaded).toBeNull();
    });
    
    it('should reject invalid UUID', async () => {
      const userData: UserData = {
        uuid: 'invalid-uuid',
        tokenHash: 'hash123',
        apiKeys: [],
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
        role: 'user',
        permissions: ['read:dashboard']
      };
      
      await expect(saveUserData(userData)).rejects.toThrow('Invalid UUID format');
    });
  });
  
  describe('deleteUser', () => {
    it('should delete existing user', async () => {
      const uuid = '660e8400-e29b-41d4-a716-446655440001';
      const userData: UserData = {
        uuid,
        tokenHash: 'hash456',
        apiKeys: [],
        createdAt: new Date().toISOString(),
        lastAccess: new Date().toISOString(),
        role: 'user',
        permissions: ['read:dashboard']
      };
      
      await saveUserData(userData);
      const deleted = await deleteUser(uuid);
      expect(deleted).toBe(true);
      
      const loaded = await loadUserData(uuid);
      expect(loaded).toBeNull();
    });
    
    it('should reject invalid UUID', async () => {
      await expect(deleteUser('../../../etc/passwd')).rejects.toThrow('Invalid UUID format');
    });
  });
  
  describe('listAllUsers', () => {
    it('should return all users', async () => {
      const users = await listAllUsers();
      expect(Array.isArray(users)).toBe(true);
    });
  });
});
