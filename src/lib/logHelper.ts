/**
 * Log Helper - Enhanced Logging with User Tracking
 *
 * Automatically captures:
 * - User info (ID, name, role)
 * - IP address
 * - Device info
 * - Browser info
 * - Location (if available)
 */

import type { LogEntry, LogScope } from './configStore';
import { v4 as uuidv4 } from 'uuid';

interface LogContext {
  userId?: string;
  userName?: string;
  userRole?: string;
  request?: Request;
}

/**
 * Parse User-Agent string to extract device and browser info
 */
function parseUserAgent(userAgent: string): { device: string; browser: string } {
  let device = 'Unknown Device';
  let browser = 'Unknown Browser';

  // Detect device
  if (/mobile/i.test(userAgent)) {
    if (/iphone/i.test(userAgent)) device = 'iPhone';
    else if (/ipad/i.test(userAgent)) device = 'iPad';
    else if (/android/i.test(userAgent)) device = 'Android Mobile';
    else device = 'Mobile Device';
  } else if (/tablet/i.test(userAgent) || /ipad/i.test(userAgent)) {
    device = 'Tablet';
  } else {
    if (/windows/i.test(userAgent)) device = 'Windows PC';
    else if (/mac/i.test(userAgent)) device = 'Mac';
    else if (/linux/i.test(userAgent)) device = 'Linux PC';
    else device = 'Desktop';
  }

  // Detect browser
  if (/edg/i.test(userAgent)) browser = 'Microsoft Edge';
  else if (/chrome/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Google Chrome';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
  else if (/firefox/i.test(userAgent)) browser = 'Mozilla Firefox';
  else if (/opera|opr/i.test(userAgent)) browser = 'Opera';

  return { device, browser };
}

/**
 * Extract IP address from request headers
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();

  return 'Unknown IP';
}

/**
 * Create enhanced log entry with automatic user tracking
 */
export function createEnhancedLogEntry(
  scope: LogScope,
  action: string,
  message: string,
  context: LogContext,
  meta?: Record<string, unknown>
): Omit<LogEntry, 'id' | 'timestamp'> {
  const { userId, userName, userRole, request } = context;

  let ipAddress: string | undefined;
  let device: string | undefined;
  let browser: string | undefined;
  let userAgent: string | undefined;

  if (request) {
    ipAddress = getClientIP(request);
    userAgent = request.headers.get('user-agent') || undefined;

    if (userAgent) {
      const parsed = parseUserAgent(userAgent);
      device = parsed.device;
      browser = parsed.browser;
    }
  }

  return {
    scope,
    action,
    message,
    userId,
    userName,
    userRole,
    ipAddress,
    userAgent,
    device,
    browser,
    meta,
  };
}

/**
 * Create complete log entry ready to save
 */
export function createLogEntry(
  scope: LogScope,
  action: string,
  message: string,
  context: LogContext,
  meta?: Record<string, unknown>
): LogEntry {
  const enhancedLog = createEnhancedLogEntry(scope, action, message, context, meta);

  return {
    ...enhancedLog,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Browser-side log entry creator (limited info)
 */
export function createClientLogEntry(
  scope: LogScope,
  action: string,
  message: string,
  userId?: string,
  userName?: string,
  userRole?: string,
  meta?: Record<string, unknown>
): LogEntry {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  let device: string | undefined;
  let browser: string | undefined;

  if (userAgent) {
    const parsed = parseUserAgent(userAgent);
    device = parsed.device;
    browser = parsed.browser;
  }

  return {
    id: uuidv4(),
    scope,
    action,
    message,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    userRole,
    userAgent,
    device,
    browser,
    meta,
  };
}
