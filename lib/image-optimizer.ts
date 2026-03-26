// Image optimization utilities for Gemini AI
// Resize to 720p (max 1280px longest side) and compress to WebP/JPEG

const MAX_DIMENSION = 1280; // Max longest side (720p equivalent)
const WEBP_QUALITY = 0.85;
const JPEG_QUALITY = 0.85;

export interface OptimizedImage {
  dataUrl: string;
  base64: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  format: 'webp' | 'jpeg';
}

export interface TokenEstimate {
  imageTokens: number;
  promptTokens: number;
  totalTokens: number;
}

/**
 * Check if browser supports WebP encoding
 */
function supportsWebP(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/**
 * Resize and compress image to 720p max resolution (longest side 1280px)
 * Uses WebP format if supported, falls back to JPEG
 */
export async function optimizeImage(dataUrl: string): Promise<OptimizedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        // Calculate new dimensions - scale based on longest side
        let { width, height } = img;
        const originalSize = Math.round((dataUrl.length * 3) / 4);
        
        const longestSide = Math.max(width, height);
        if (longestSide > MAX_DIMENSION) {
          const ratio = MAX_DIMENSION / longestSide;
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
        
        // Use better image smoothing for quality resize
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try WebP first (smaller file size), fallback to JPEG
        const useWebP = supportsWebP();
        const format = useWebP ? "webp" : "jpeg";
        const quality = useWebP ? WEBP_QUALITY : JPEG_QUALITY;
        const mimeType = useWebP ? "image/webp" : "image/jpeg";
        
        const optimizedDataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = optimizedDataUrl.split(",")[1];
        const optimizedSize = Math.round((base64.length * 3) / 4);
        
        resolve({
          dataUrl: optimizedDataUrl,
          base64,
          originalSize,
          optimizedSize,
          width,
          height,
          format,
        });
      } catch (error) {
        reject(error);
      }
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
