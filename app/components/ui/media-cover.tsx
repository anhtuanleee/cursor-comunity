"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const VIDEO_EXTENSION = /\.(mp4|webm|mov|m4v)(?:$|[?#])/i;

export function isVideoUrl(url: string) {
  return VIDEO_EXTENSION.test(url);
}

interface MediaCoverProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  onError?: () => void;
}

export function MediaCover({
  src,
  alt,
  className,
  priority = false,
  onError,
}: MediaCoverProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = isVideoUrl(src);

  useEffect(() => {
    const element = videoRef.current;
    if (!video || !element) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          void element.play().catch(() => {
            // Autoplay can be blocked by browser-level settings.
          });
        } else {
          element.pause();
        }
      },
      { rootMargin: "240px 0px", threshold: 0.01 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [src, video]);

  if (video) {
    return (
      // Decorative gallery previews are always muted and have no audio controls.
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        ref={videoRef}
        src={src}
        aria-label={alt}
        muted
        loop
        playsInline
        preload={priority ? "auto" : "metadata"}
        onError={onError}
        className={cn("block object-cover", className)}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      onError={onError}
      className={cn("block object-cover", className)}
    />
  );
}
