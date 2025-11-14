/**
 * Backend Wake-up Utility
 * Pings the backend health endpoint to wake it up from cold start
 */

import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://social-os-backend-6.onrender.com/api/v1';
const HEALTH_ENDPOINT = `${BACKEND_URL}/auth/health`;

let isWakingUp = false;
let lastWakeupAttempt = 0;
const WAKEUP_COOLDOWN = 30000; // 30 seconds cooldown between wake-up attempts

/**
 * Ping the backend health endpoint to wake it up
 * Returns true if backend is awake, false otherwise
 */
export async function wakeupBackend(): Promise<boolean> {
  // Prevent multiple simultaneous wake-up attempts
  if (isWakingUp) {
    console.log('[Wakeup] Wake-up already in progress');
    return false;
  }

  // Check cooldown
  const now = Date.now();
  if (now - lastWakeupAttempt < WAKEUP_COOLDOWN) {
    console.log('[Wakeup] Cooldown active, skipping wake-up');
    return false;
  }

  isWakingUp = true;
  lastWakeupAttempt = now;

  try {
    console.log('[Wakeup] Pinging backend health endpoint...');
    const startTime = Date.now();
    
    const response = await axios.get(HEALTH_ENDPOINT, {
      timeout: 5000, // 5 second timeout for health check
    });

    const duration = Date.now() - startTime;
    console.log(`[Wakeup] Backend responded in ${duration}ms:`, response.data);

    return response.status === 200;
  } catch (error: any) {
    console.warn('[Wakeup] Backend health check failed:', error.message);
    return false;
  } finally {
    isWakingUp = false;
  }
}

/**
 * Check if backend is likely cold (needs wake-up)
 * Based on time since last successful request
 */
let lastSuccessfulRequest = Date.now();
const COLD_START_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export function markBackendActive(): void {
  lastSuccessfulRequest = Date.now();
}

export function isBackendLikelyCold(): boolean {
  return Date.now() - lastSuccessfulRequest > COLD_START_THRESHOLD;
}

/**
 * Attempt to wake up backend if it's likely cold
 * Call this before critical operations like login
 */
export async function ensureBackendAwake(): Promise<void> {
  if (isBackendLikelyCold()) {
    console.log('[Wakeup] Backend likely cold, attempting wake-up...');
    await wakeupBackend();
    // Wait a bit for backend to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
