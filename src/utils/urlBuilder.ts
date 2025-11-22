/**
 * Build base URL từ env variables
 * Sử dụng MASK_URI cho production, fallback về localhost cho dev
 */
export function buildBaseUrl(): string {
  const maskUri = process.env.MASK_URI;
  const maskPort = process.env.MASK_PORT || '443';
  const maskSsl = process.env.MASK_SSL === 'true';
  const originPort = process.env.ORIGIN_PORT || '2082';

  if (maskUri) {
    // Production: dùng MASK_URI
    const protocol = maskSsl ? 'https' : 'http';
    const defaultPort = maskSsl ? '443' : '80';
    const portSuffix = maskPort === defaultPort ? '' : `:${maskPort}`;
    return `${protocol}://${maskUri}${portSuffix}`;
  } else {
    // Development: dùng localhost
    return `http://localhost:${originPort}`;
  }
}

/**
 * Build redirect URI cho bot OAuth
 */
export function buildBotRedirectUri(): string {
  return `${buildBaseUrl()}/auth/callback`;
}

/**
 * Build redirect URI cho dashboard OAuth
 */
export function buildDashboardRedirectUri(): string {
  return `${buildBaseUrl()}/dashboard/callback`;
}
