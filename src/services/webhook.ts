import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { config } from '../config';
import { WebhookPayload } from '../types';

function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string
): Promise<{ statusCode: number }> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body, secret);

  const parsed = new URL(url);
  const isHttps = parsed.protocol === 'https:';

  return new Promise((resolve, reject) => {
    const req = (isHttps ? https : http).request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-Webhook-Signature': signature,
        },
        timeout: 10000,
      },
      (res) => {
        // Consume response body
        res.on('data', () => {});
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0 });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Webhook delivery timeout'));
    });

    req.write(body);
    req.end();
  });
}

function isRetryable(statusCode: number): boolean {
  return statusCode >= 500 && statusCode < 600;
}

export async function deliverWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
  webhookSecret: string
): Promise<void> {
  const { maxRetries, baseDelayMs } = config.webhook;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendWebhook(webhookUrl, payload, webhookSecret);

      if (result.statusCode >= 200 && result.statusCode < 300) {
        console.log(`Webhook delivered successfully to ${webhookUrl} (attempt ${attempt + 1})`);
        return;
      }

      if (result.statusCode >= 400 && result.statusCode < 500) {
        console.log(`Webhook delivery got ${result.statusCode} (client error, no retry)`);
        return;
      }

      if (isRetryable(result.statusCode) && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`Webhook delivery got ${result.statusCode}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.log(`Webhook delivery failed with status ${result.statusCode} after ${attempt + 1} attempts`);
      return;
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`Webhook delivery error: ${(err as Error).message}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      console.log(`Webhook delivery failed after ${attempt + 1} attempts: ${(err as Error).message}`);
      return;
    }
  }
}
