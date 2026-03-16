"use client";

import { useState, useId } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { getAuthToken } from "@/lib/auth";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
}

export function ProductImageManager({ images, onChange }: Props) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (imageFiles.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4004";
      const token = getAuthToken();
      const urls: string[] = [];
      for (const file of imageFiles) {
        const body = new FormData();
        body.append("image", file);
        const res = await fetch(`${base}/api/upload/image`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Upload failed for ${file.name}`);
        }
        const data = await res.json();
        urls.push(data.url);
      }
      onChange([...images, ...urls]);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "Image upload failed",
      );
    } finally {
      setUploading(false);
    }
  }

  function addUrl() {
    const url = newImageUrl.trim();
    if (!url) return;
    onChange([...images, url]);
    setNewImageUrl("");
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function moveImage(index: number, direction: "up" | "down") {
    const next = [...images];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    onChange(next);
  }

  function setAsPrimary(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">
          <span className="label-text">Product Images</span>
        </label>
        <p className="text-sm text-base-content/70 mb-2">
          Upload images or add by URL. The first image is the primary product
          image shown in listings and on social previews.
        </p>

        {/* Drop zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-base-300 hover:border-primary/50"
          } ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
          }}
          onClick={() => {
            if (!uploading) document.getElementById(inputId)?.click();
          }}>
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <span className="loading loading-spinner loading-md" />
              <span className="text-sm text-base-content/70">Uploading…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-base-content/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
                />
              </svg>
              <span className="text-sm font-medium">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-base-content/50">
                PNG, JPG, GIF, WEBP up to 10 MB
              </span>
            </div>
          )}
          <input
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                uploadFiles(e.target.files);
                e.target.value = "";
              }
            }}
          />
        </div>

        {uploadError && (
          <p className="text-sm text-error mt-2">{uploadError}</p>
        )}

        <div className="divider text-xs text-base-content/50">
          OR ADD BY URL
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            className="input input-bordered input-sm flex-1"
            placeholder="https://example.com/image.jpg"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={addUrl}>
            Add URL
          </button>
        </div>
      </div>

      {/* Image list */}
      {images.length > 0 ? (
        <div className="space-y-2">
          {images.map((url, index) => (
            <div
              key={url + index}
              className={`flex items-center gap-2 p-2 rounded-lg ${
                index === 0 ? "bg-primary/10 ring-1 ring-primary/30" : "bg-base-200"
              }`}>
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <Image
                    src={url}
                    alt={`Product image ${index + 1}`}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-cover rounded"
                    unoptimized
                  />
                  {index === 0 && (
                    <span className="absolute -top-1.5 -right-1.5 badge badge-primary badge-xs gap-0.5 px-1">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      Primary
                    </span>
                  )}
                </div>
                <span className="text-sm truncate flex-1">{url}</span>
              </div>
              <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                {index !== 0 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-xs gap-1"
                    title="Set as primary image"
                    onClick={() => setAsPrimary(index)}>
                    <Star className="w-3 h-3" />
                    Primary
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => moveImage(index, "up")}
                  disabled={index === 0}>
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => moveImage(index, "down")}
                  disabled={index === images.length - 1}>
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-error btn-xs"
                  onClick={() => removeImage(index)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-base-content/60 italic">
          No images added yet.
        </p>
      )}
    </div>
  );
}
