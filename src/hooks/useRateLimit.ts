// Rate limiting hook
import { useState, useEffect, useCallback } from 'react';
import { checkRateLimit, resetRateLimit, getRateLimitStatus } from '../utils/auth';

interface UseRateLimitReturn {
  attemptsRemaining: number;
  isLocked: boolean;
  retryAfter: number;
  checkAttempt: () => { allowed: boolean; retryAfter: number };
  reset: () => void;
}

const RATE_LIMIT_ATTEMPTS = 5;

export function useRateLimit(identifier: string): UseRateLimitReturn {
  const [attemptsRemaining, setAttemptsRemaining] = useState(RATE_LIMIT_ATTEMPTS);
  const [isLocked, setIsLocked] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  const updateStatus = useCallback(() => {
    const status = getRateLimitStatus(identifier);
    if (status) {
      const now = Date.now();
      if (status.lockedUntil && now < status.lockedUntil) {
        setIsLocked(true);
        setRetryAfter(Math.ceil((status.lockedUntil - now) / 1000));
        setAttemptsRemaining(0);
      } else {
        setIsLocked(false);
        setRetryAfter(0);
        setAttemptsRemaining(Math.max(0, RATE_LIMIT_ATTEMPTS - status.attempts));
      }
    } else {
      setIsLocked(false);
      setRetryAfter(0);
      setAttemptsRemaining(RATE_LIMIT_ATTEMPTS);
    }
  }, [identifier]);

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [updateStatus]);

  const checkAttempt = useCallback(() => {
    const result = checkRateLimit(identifier);
    updateStatus();
    return result;
  }, [identifier, updateStatus]);

  const reset = useCallback(() => {
    resetRateLimit(identifier);
    updateStatus();
  }, [identifier, updateStatus]);

  return {
    attemptsRemaining,
    isLocked,
    retryAfter,
    checkAttempt,
    reset
  };
}