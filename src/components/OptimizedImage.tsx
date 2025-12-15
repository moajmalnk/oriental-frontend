import React, { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * OptimizedImage Component
 *
 * Automatically optimizes images for display by:
 * 1. Resizing large images to match display size (extracted from className)
 * 2. Compressing images to reduce file size
 * 3. Caching optimized versions to avoid re-processing
 * 4. Lazy loading for better performance
 *
 * Usage:
 * - For lists/thumbnails: Auto-optimizes based on className (e.g., "w-10 h-10" -> 40x40px)
 * - For full-size display: Set maxWidth={0} or maxHeight={0} to disable optimization
 *
 * Examples:
 * ```tsx
 * // Optimized for list view (auto-detects 40x40px from className)
 * <OptimizedImage src={url} alt="Student" className="w-10 h-10 rounded-full" />
 *
 * // Full quality for certificates/printing
 * <OptimizedImage src={url} alt="Student" className="w-full" maxWidth={0} />
 * ```
 */
interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  /**
   * Maximum width for optimization. Set to 0 to disable optimization.
   * Default: auto-detect from className or 200px
   */
  maxWidth?: number;
  /**
   * Maximum height for optimization. Set to 0 to disable optimization.
   * Default: auto-detect from className or 200px
   */
  maxHeight?: number;
  /**
   * Image quality (0-1). Default: 0.92
   */
  quality?: number;
}

// Simple in-memory cache for optimized images
const imageCache = new Map<string, string>();

// Helper to extract pixel size from Tailwind class (e.g., "w-10" -> 40px)
const extractPixelSize = (className: string, prefix: string): number | null => {
  const match = className.match(new RegExp(`${prefix}-(\\d+)`));
  if (match) {
    const value = parseInt(match[1]);
    // Tailwind uses 4px increments (w-10 = 40px)
    // Multiply by 2 for better quality on high-DPI displays
    return value * 4 * 2;
  }
  return null;
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  fallbackIcon,
  maxWidth,
  maxHeight,
  quality = 0.92,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState<string>(src);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Extract size and shape info from className
  const sizeMatch = className?.match(/(w-\d+|h-\d+)/g) || [];
  const widthClass = sizeMatch.find((c) => c.startsWith("w-")) || "w-10";
  const heightClass = sizeMatch.find((c) => c.startsWith("h-")) || "h-10";
  const isRounded = className?.includes("rounded-full");

  // Auto-detect target size from className if not provided
  const targetWidth =
    maxWidth !== undefined
      ? maxWidth
      : extractPixelSize(className || "", "w") || 400;
  const targetHeight =
    maxHeight !== undefined
      ? maxHeight
      : extractPixelSize(className || "", "h") || 400;

  // Optimize image using Canvas API
  useEffect(() => {
    // Skip optimization if disabled (maxWidth or maxHeight is 0)
    if (targetWidth === 0 || targetHeight === 0) {
      setOptimizedSrc(src);
      return;
    }

    // Skip optimization for blob URLs (already in memory)
    if (src.startsWith("blob:")) {
      setOptimizedSrc(src);
      return;
    }

    // Check cache first
    const cacheKey = `${src}_${targetWidth}x${targetHeight}_${quality}`;
    const cached = imageCache.get(cacheKey);
    if (cached) {
      setOptimizedSrc(cached);
      return;
    }

    // Load and optimize image
    const img = new Image();
    img.crossOrigin = "anonymous"; // Enable CORS if needed

    img.onload = () => {
      try {
        // Only optimize if image is larger than target size
        if (img.width <= targetWidth && img.height <= targetHeight) {
          setOptimizedSrc(src);
          return;
        }

        // Create canvas for resizing
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setOptimizedSrc(src);
          return;
        }

        // Calculate aspect ratio
        const aspectRatio = img.width / img.height;
        let newWidth = targetWidth;
        let newHeight = targetHeight;

        if (aspectRatio > 1) {
          // Landscape
          newHeight = targetWidth / aspectRatio;
        } else {
          // Portrait
          newWidth = targetHeight * aspectRatio;
        }

        // Set canvas size
        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw resized image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to blob and create URL
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedUrl = URL.createObjectURL(blob);
              imageCache.set(cacheKey, optimizedUrl);
              setOptimizedSrc(optimizedUrl);
            } else {
              setOptimizedSrc(src);
            }
          },
          "image/jpeg",
          quality
        );
      } catch (error) {
        console.error("Error optimizing image:", error);
        setOptimizedSrc(src);
      }
    };

    img.onerror = () => {
      setOptimizedSrc(src);
    };

    img.src = src;

    // Cleanup function
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, targetWidth, targetHeight, quality]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Default fallback icon
  const defaultFallback = (
    <div
      className={cn(
        "w-full h-full bg-muted flex items-center justify-center",
        isRounded ? "rounded-full" : "rounded"
      )}
    >
      <User className="h-[60%] w-[60%] text-muted-foreground" />
    </div>
  );

  const fallback = fallbackIcon || defaultFallback;

  return (
    <div
      className={cn(
        "relative inline-block",
        widthClass,
        heightClass,
        className?.includes("object-cover") ? "overflow-hidden" : ""
      )}
    >
      {/* Loading skeleton */}
      {isLoading && !hasError && (
        <div
          className={cn(
            "absolute inset-0 animate-pulse bg-muted",
            isRounded
              ? "rounded-full"
              : className?.match(/rounded[^\s]*/)?.[0] || "rounded"
          )}
        />
      )}

      {/* Actual image */}
      {!hasError && (
        <img
          src={optimizedSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-300",
            isLoading ? "opacity-0 absolute inset-0" : "opacity-100",
            className
          )}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          {fallback}
        </div>
      )}
    </div>
  );
};
