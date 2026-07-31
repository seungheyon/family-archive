"use client";

import { useEffect, useRef } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

export function PhotoLightbox({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const lightbox = new PhotoSwipeLightbox({
      gallery: container,
      children: "a",
      pswpModule: () => import("photoswipe"),
    });
    lightbox.init();

    return () => lightbox.destroy();
  }, [src]);

  return (
    <div ref={containerRef}>
      <a href={src} data-pswp-width="1600" data-pswp-height="1600">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[70vh] w-auto cursor-zoom-in rounded-xl object-contain"
        />
      </a>
    </div>
  );
}
