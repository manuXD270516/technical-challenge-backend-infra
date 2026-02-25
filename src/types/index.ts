export type Plan = 'basic' | 'pro';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  api_key_hash: string;
  webhook_secret: string;
  plan: Plan;
  credits: number;
  created_at: Date;
}

export interface Job {
  id: string;
  user_id: string;
  status: JobStatus;
  image_url: string;
  webhook_url: string | null;
  options: Record<string, unknown> | null;
  result_url: string | null;
  error: { code: string; message: string } | null;
  created_at: Date;
  completed_at: Date | null;
  failed_at: Date | null;
}

export interface IdempotencyRecord {
  key: string;
  user_id: string;
  response_status: number;
  response_body: unknown;
  created_at: Date;
}

export interface CreateJobRequest {
  imageUrl: string;
  webhookUrl?: string;
  options?: {
    quality?: 'standard' | 'high' | 'ultra';
    format?: 'png' | 'jpeg' | 'webp';
    [key: string]: unknown;
  };
}

export interface JobResponse {
  jobId: string;
  status: JobStatus;
  createdAt: string;
  imageUrl?: string;
  webhookUrl?: string;
  options?: Record<string, unknown>;
  resultUrl?: string;
  error?: { code: string; message: string };
  completedAt?: string;
  failedAt?: string;
}

export interface CallbackPayload {
  jobId: string;
  status: 'completed' | 'failed';
  resultUrl?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface WebhookPayload {
  event: 'job.completed' | 'job.failed';
  jobId: string;
  status: 'completed' | 'failed';
  resultUrl?: string;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}
