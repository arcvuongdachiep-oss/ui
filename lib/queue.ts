// Simple in-memory queue for serverless environment
// Note: In production with multiple instances, use Redis/Upstash

interface QueueItem {
  id: string;
  userId: string;
  addedAt: number;
  status: 'waiting' | 'processing';
}

// Global queue state (persists across requests in same instance)
let queue: QueueItem[] = [];
let processing = 0;

// Config
export const QUEUE_CONFIG = {
  MAX_CONCURRENT: 1,        // Max requests processing at once
  MAX_QUEUE_SIZE: 10,       // Max waiting requests
  RATE_LIMIT_WINDOW: 60,    // 1 minute in seconds
  RATE_LIMIT_MAX: 2,        // Max requests per window
  REQUEST_TIMEOUT: 60000,   // 60 seconds timeout
};

// Add request to queue
export function addToQueue(userId: string): { 
  success: boolean; 
  position?: number; 
  error?: string;
  queueId?: string;
} {
  // Clean up stale items (older than 2 minutes)
  const now = Date.now();
  queue = queue.filter(item => now - item.addedAt < 120000);
  
  // Check if queue is full
  if (queue.length >= QUEUE_CONFIG.MAX_QUEUE_SIZE) {
    return { success: false, error: 'queue_full' };
  }
  
  // Check if user already has a request in queue
  const existingIndex = queue.findIndex(item => item.userId === userId);
  if (existingIndex !== -1) {
    return { 
      success: true, 
      position: existingIndex + 1,
      queueId: queue[existingIndex].id
    };
  }
  
  // Add new item
  const queueId = `${userId}-${now}`;
  queue.push({
    id: queueId,
    userId,
    addedAt: now,
    status: 'waiting'
  });
  
  return { 
    success: true, 
    position: queue.length,
    queueId
  };
}

// Get queue position for a user
export function getQueuePosition(userId: string): number {
  const index = queue.findIndex(item => item.userId === userId);
  return index === -1 ? 0 : index + 1;
}

// Check if can start processing
export function canStartProcessing(userId: string): boolean {
  if (processing >= QUEUE_CONFIG.MAX_CONCURRENT) {
    return false;
  }
  
  // Must be first in queue or no queue
  const position = getQueuePosition(userId);
  return position <= 1;
}

// Start processing
export function startProcessing(userId: string): boolean {
  if (!canStartProcessing(userId)) {
    return false;
  }
  
  const index = queue.findIndex(item => item.userId === userId);
  if (index !== -1) {
    queue[index].status = 'processing';
  }
  
  processing++;
  return true;
}

// Finish processing
export function finishProcessing(userId: string): void {
  processing = Math.max(0, processing - 1);
  queue = queue.filter(item => item.userId !== userId);
}

// Get queue status
export function getQueueStatus(): {
  queueLength: number;
  processing: number;
  estimatedWait: number;
} {
  return {
    queueLength: queue.length,
    processing,
    estimatedWait: queue.length * 30, // Estimate 30s per request
  };
}

// Rate limit storage (in-memory, resets on cold start)
const rateLimitMap = new Map<string, number[]>();

// Check rate limit
export function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const windowStart = now - (QUEUE_CONFIG.RATE_LIMIT_WINDOW * 1000);
  
  // Get user's request timestamps
  let timestamps = rateLimitMap.get(userId) || [];
  
  // Filter to only include requests within window
  timestamps = timestamps.filter(ts => ts > windowStart);
  
  const allowed = timestamps.length < QUEUE_CONFIG.RATE_LIMIT_MAX;
  const remaining = Math.max(0, QUEUE_CONFIG.RATE_LIMIT_MAX - timestamps.length);
  
  // Calculate reset time
  let resetIn = 0;
  if (timestamps.length > 0 && !allowed) {
    const oldestInWindow = Math.min(...timestamps);
    resetIn = Math.ceil((oldestInWindow + QUEUE_CONFIG.RATE_LIMIT_WINDOW * 1000 - now) / 1000);
  }
  
  return { allowed, remaining, resetIn };
}

// Record a request for rate limiting
export function recordRequest(userId: string): void {
  const timestamps = rateLimitMap.get(userId) || [];
  timestamps.push(Date.now());
  rateLimitMap.set(userId, timestamps);
}
