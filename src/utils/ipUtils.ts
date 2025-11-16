/**
 * IP Utility Functions
 * Extract real IP address from requests behind proxies
 */

import type { Request } from 'express';

/**
 * Extract the real client IP from request
 * Handles proxy headers like X-Forwarded-For, X-Real-IP
 */
export function getClientIP(req: Request): string | null {
  // Try X-Forwarded-For (most common with proxies/load balancers)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // We want the first one (original client)
    const ips = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor;
    const firstIP = ips.split(',')[0].trim();
    if (firstIP) {
      return firstIP;
    }
  }

  // Try X-Real-IP (Nginx)
  const xRealIP = req.headers['x-real-ip'];
  if (xRealIP && typeof xRealIP === 'string') {
    return xRealIP;
  }

  // Try CF-Connecting-IP (Cloudflare)
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  if (cfConnectingIP && typeof cfConnectingIP === 'string') {
    return cfConnectingIP;
  }

  // Try True-Client-IP (Cloudflare, Akamai)
  const trueClientIP = req.headers['true-client-ip'];
  if (trueClientIP && typeof trueClientIP === 'string') {
    return trueClientIP;
  }

  // Fallback to socket remote address
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // If all else fails, return null
  return null;
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: Request): string | null {
  const userAgent = req.headers['user-agent'];
  return userAgent || null;
}

/**
 * Validate if IP address is valid (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

  // IPv6 regex (simplified)
  const ipv6Regex = /^([\da-f]{0,4}:){7}[\da-f]{0,4}$/i;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Check if IP is a private/local IP
 */
export function isPrivateIP(ip: string): boolean {
  if (!ip) return false;

  // IPv4 private ranges
  const privateIPv4Ranges = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,               // 192.168.0.0/16
    /^127\./,                    // 127.0.0.0/8 (localhost)
    /^169\.254\./,               // 169.254.0.0/16 (link-local)
  ];

  for (const range of privateIPv4Ranges) {
    if (range.test(ip)) {
      return true;
    }
  }

  // IPv6 localhost
  if (ip === '::1' || ip === 'localhost') {
    return true;
  }

  return false;
}

/**
 * Anonymize IP for logging (GDPR compliance)
 * e.g., "192.168.1.100" -> "192.168.1.***"
 */
export function anonymizeIP(ip: string): string {
  if (!ip) return '***.***.***. ***';

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
  }

  // IPv6 - mask last 4 groups
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return parts.slice(0, 4).join(':') + ':****:****:****:****';
    }
  }

  return '***';
}
