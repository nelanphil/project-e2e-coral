"use client";

import { useState } from "react";
import Image from "next/image";

type ProductImageGalleryProps = {
  images: string[];
  alt: string;
};

export function ProductImageGallery({ images, alt }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const hasImages = images?.length > 0;
  const mainSrc = hasImages ? images[selectedIndex] : null;

  if (!hasImages) {
    return (
      <div
        className="aspect-square flex items-center justify-center text-base-content/50"
        aria-hidden
      >
        No image
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full aspect-square md:aspect-auto md:h-[min(42vh,400px)] overflow-hidden relative rounded-lg">
        <Image
          src={mainSrc!}
          alt={alt}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 400px"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                selectedIndex === i
                  ? "border-primary"
                  : "border-base-300 hover:border-base-content/30"
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <Image
                src={src}
                alt={`${alt} - view ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
