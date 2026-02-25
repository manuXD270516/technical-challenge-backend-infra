import http from 'http';
import https from 'https';
import { URL } from 'url';
import { config } from '../config';

export interface DispatchResult {
  success: boolean;
  error?: string;
}

export async function dispatchToProcessingService(
  jobId: string,
  imageUrl: string,
  options: Record<string, unknown> | null
): Promise<DispatchResult> {
  const callbackUrl = `${config.callbackBaseUrl}/internal/callback`;

  const payload = JSON.stringify({
    jobId,
    imageUrl,
    callbackUrl,
    options: options || {},
  });

  const url = new URL(config.processingServiceUrl);
  const isHttps = url.protocol === 'https:';

  return new Promise((resolve) => {
    const req = (isHttps ? https : http).request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 10000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: `Processing service returned ${res.statusCode}: ${body}`,
            });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({ success: false, error: `Processing service error: ${err.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Processing service timeout' });
    });

    req.write(payload);
    req.end();
  });
}
