import { NextRequest, NextResponse } from "next/server";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://hiepd5.com",
  "https://www.hiepd5.com",
  // Allow localhost for development
  ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
];

// Check if origin is allowed
export function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  
  // In production, strictly check origin
  if (process.env.NODE_ENV === "production") {
    if (!origin && !referer) {
      // Allow same-origin requests (no origin header)
      return true;
    }
    
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return true;
    }
    
    if (referer) {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      return ALLOWED_ORIGINS.includes(refererOrigin);
    }
    
    return false;
  }
  
  // In development, allow all
  return true;
}

// Add CORS headers to response
export function withCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  
  return response;
}

// Create a blocked response for unauthorized origins
export function blockedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized request origin" },
    { status: 403 }
  );
}

// Sanitize string input - remove potential injection characters
export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }
  
  // Remove null bytes, control characters, and excessive whitespace
  return input
    .replace(/\0/g, "")                    // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars
    .trim()
    .slice(0, 10000);                      // Limit length
}

// Sanitize base64 image data
export function sanitizeBase64Image(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }
  
  // Check if it's a valid data URL or base64 string
  const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
  const base64Pattern = /^[A-Za-z0-9+/=]+$/;
  
  if (dataUrlPattern.test(input)) {
    // It's a data URL - validate the base64 part
    const [header, base64Data] = input.split(",");
    if (base64Data && base64Pattern.test(base64Data)) {
      // Limit size (max ~10MB base64)
      if (base64Data.length > 14000000) {
        return null;
      }
      return input;
    }
  }
  
  return null;
}

// Validate mode ID
export function validateModeId(mode: unknown): mode is "strict" | "creative" | "cinematic" | "random" {
  return typeof mode === "string" && ["strict", "creative", "cinematic", "random"].includes(mode);
}

// Rate limit check for sensitive operations
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkBruteForce(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxAttempts = 10;
  
  const record = failedAttempts.get(identifier);
  
  if (!record || now - record.lastAttempt > windowMs) {
    return true; // Allow
  }
  
  return record.count < maxAttempts;
}

export function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const record = failedAttempts.get(identifier);
  
  if (!record || now - record.lastAttempt > 60000) {
    failedAttempts.set(identifier, { count: 1, lastAttempt: now });
  } else {
    failedAttempts.set(identifier, { count: record.count + 1, lastAttempt: now });
  }
}

// Clean up old records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of failedAttempts.entries()) {
    if (now - value.lastAttempt > 300000) { // 5 minutes
      failedAttempts.delete(key);
    }
  }
}, 60000);
