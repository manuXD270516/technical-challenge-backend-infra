import { Router, Request, Response } from 'express';
import { processJob } from '../services/mockProcessor';

const router = Router();

// POST /mock/process - Mock processing service endpoint
router.post('/process', (req: Request, res: Response) => {
  const { jobId, imageUrl, callbackUrl, options } = req.body;

  if (!jobId || !imageUrl || !callbackUrl) {
    res.status(400).json({
      error: 'Missing required fields: jobId, imageUrl, callbackUrl',
    });
    return;
  }

  // Accept the job immediately, process asynchronously
  processJob({ jobId, imageUrl, callbackUrl, options: options || {} });

  res.status(202).json({
    accepted: true,
    jobId,
  });
});

export { router as mockRouter };
