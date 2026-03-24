// Image optimization utilities for Gemini AI
// Resize to 720p and compress to reduce token usage

const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;
const JPEG_QUALITY = 0.8;

export interface OptimizedImage {
  dataUrl: string;
  base64: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
}

export interface TokenEstimate {
  imageTokens: number;
  promptTokens: number;
  totalTokens: number;
}

/**
 * Resize and compress image to 720p max resolution
 */
export async function optimizeImage(dataUrl: string): Promise<OptimizedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      const originalSize = Math.round((dataUrl.length * 3) / 4); // Approximate original size
      
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      
      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with compression
      const optimizedDataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
      const base64 = optimizedDataUrl.split(",")[1];
      const optimizedSize = Math.round((base64.length * 3) / 4);
      
      resolve({
        dataUrl: optimizedDataUrl,
        base64,
        originalSize,
        optimizedSize,
        width,
        height,
      });
    };
    
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

/**
 * Estimate tokens for Gemini 2.5 Flash
 * - Text: ~1 token per 4 characters
 * - Image: Based on resolution, roughly (width * height) / 750 tokens
 */
export function estimateTokens(
  images: OptimizedImage[],
  promptText: string = ""
): TokenEstimate {
  // Text tokens: ~1 token per 4 characters
  const promptTokens = Math.ceil(promptText.length / 4);
  
  // Image tokens for Gemini 2.5 Flash
  // Based on Google's documentation: images are processed at their native resolution
  // Approximate: (width * height) / 750 for standard images
  let imageTokens = 0;
  for (const img of images) {
    // Gemini 2.5 Flash uses ~258 tokens for a small image, scales with resolution
    // For 720p max: roughly base64.length / 4 is a conservative estimate
    const pixelTokens = Math.ceil((img.width * img.height) / 750);
    const base64Tokens = Math.ceil(img.base64.length / 4);
    // Use the smaller of the two estimates
    imageTokens += Math.min(pixelTokens, base64Tokens);
  }
  
  return {
    imageTokens,
    promptTokens,
    totalTokens: imageTokens + promptTokens,
  };
}

/**
 * Format token count for display
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Calculate savings percentage
 */
export function calculateSavings(original: number, optimized: number): number {
  if (original === 0) return 0;
  return Math.round(((original - optimized) / original) * 100);
}