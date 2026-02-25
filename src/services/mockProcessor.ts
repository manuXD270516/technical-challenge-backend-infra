import http from 'http';
import https from 'https';
import { URL } from 'url';

const FAILURE_RATE = 0.2;
const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 5000;

interface ProcessingRequest {
  jobId: string;
  imageUrl: string;
  callbackUrl: string;
  options: Record<string, unknown>;
}

function randomDelay(): number {
  return Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;
}

function shouldFail(): boolean {
  return Math.random() < FAILURE_RATE;
}

function sendCallback(callbackUrl: string, payload: Record<string, unknown>): void {
  const body = JSON.stringify(payload);
  const parsed = new URL(callbackUrl);
  const isHttps = parsed.protocol === 'https:';

  const req = (isHttps ? https : http).request(
    {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        console.log(`[MockProcessor] Callback sent for job ${payload.jobId}, status: ${res.statusCode}`);
      });
    }
  );

  req.on('error', (err) => {
    console.error(`[MockProcessor] Callback error for job ${payload.jobId}: ${err.message}`);
  });

  req.write(body);
  req.end();
}

export function processJob(request: ProcessingRequest): void {
  const delay = randomDelay();
  console.log(`[MockProcessor] Processing job ${request.jobId}, delay: ${delay}ms`);

  setTimeout(() => {
    if (shouldFail()) {
      console.log(`[MockProcessor] Job ${request.jobId} failed (simulated)`);
      sendCallback(request.callbackUrl, {
        jobId: request.jobId,
        status: 'failed',
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Image processing failed (simulated error)',
        },
      });
    } else {
      console.log(`[MockProcessor] Job ${request.jobId} completed`);
      sendCallback(request.callbackUrl, {
        jobId: request.jobId,
        status: 'completed',
        resultUrl: `https://cdn.vibepeak.com/results/${request.jobId}.png`,
      });
    }
  }, delay);
}
