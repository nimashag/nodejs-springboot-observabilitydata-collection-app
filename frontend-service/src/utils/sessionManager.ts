/**
 * Session Manager - Manages session ID that persists across frontend requests
 * Session ID is generated once per browser session and reused for all requests
 */

const SESSION_ID_KEY = 'app_session_id';
const SESSION_ID_PREFIX = 'SESSION';

/**
 * Generate a UUID v4 compatible string
 */
function generateSessionId(): string {
  // Use crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${SESSION_ID_PREFIX}-${crypto.randomUUID()}`;
  }
  
  // Fallback UUID generator
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  
  return `${SESSION_ID_PREFIX}-${uuid}`;
}

/**
 * Get or create session ID
 * - If session ID exists in localStorage, return it
 * - If not, generate a new one, store it, and return it
 */
export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Clear session ID (useful for logout)
 */
export function clearSessionId(): void {
  localStorage.removeItem(SESSION_ID_KEY);
}

/**
 * Reset session ID (generate a new one)
 */
export function resetSessionId(): string {
  const newSessionId = generateSessionId();
  localStorage.setItem(SESSION_ID_KEY, newSessionId);
  return newSessionId;
}

