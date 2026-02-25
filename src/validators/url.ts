import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  const ipv4PrivateRanges = [
    /^10\./,                          // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./,                     // 192.168.0.0/16
    /^127\./,                          // 127.0.0.0/8 (loopback)
    /^0\./,                            // 0.0.0.0/8
    /^169\.254\./,                     // 169.254.0.0/16 (link-local)
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGNAT)
  ];

  for (const range of ipv4PrivateRanges) {
    if (range.test(ip)) return true;
  }

  // IPv6 private/reserved
  if (ip === '::1') return true;                // loopback
  if (ip.startsWith('fe80:')) return true;       // link-local
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // unique local

  return false;
}

export async function validateUrl(
  url: string,
  requireHttps: boolean = false
): Promise<{ valid: boolean; error?: string }> {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Protocol check
  if (requireHttps && parsed.protocol !== 'https:') {
    return { valid: false, error: 'URL must use HTTPS' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'URL must use HTTP or HTTPS' };
  }

  const hostname = parsed.hostname;

  // Check if hostname is an IP directly
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      return { valid: false, error: 'URL resolves to a private/reserved IP address' };
    }
    return { valid: true };
  }

  // Resolve DNS and check all IPs
  try {
    const ips: string[] = [];

    try {
      const ipv4 = await dnsResolve4(hostname);
      ips.push(...ipv4);
    } catch {
      // No IPv4 records
    }

    try {
      const ipv6 = await dnsResolve6(hostname);
      ips.push(...ipv6);
    } catch {
      // No IPv6 records
    }

    if (ips.length === 0) {
      return { valid: false, error: 'URL hostname could not be resolved' };
    }

    for (const ip of ips) {
      if (isPrivateIP(ip)) {
        return { valid: false, error: 'URL resolves to a private/reserved IP address' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Failed to resolve URL hostname' };
  }
}

export { isPrivateIP };
