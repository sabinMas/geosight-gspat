"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";
import { Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LandCoverBucket } from "@/types";

interface ImageUploadProps {
  onClassify: (summary: string, buckets: LandCoverBucket[], previewUrl: string | null) => void;
  previewUrl: string | null;
}

function computeSaturation(r: number, g: number, b: number) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) {
    return 0;
  }

  const lightness = (max + min) / 2;
  const delta = max - min;
  return delta / (1 - Math.abs(2 * lightness - 1));
}

function readImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to read ${file.name}.`));
    };
    image.src = url;
  });
}

async function classifyImage(file: File): Promise<{ summary: string; buckets: LandCoverBucket[] }> {
  const image = await readImageElement(file);
  const maxDimension = 200;
  const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable for image analysis.");
  }

  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const counts = {
    vegetation: 0,
    water: 0,
    urban: 0,
    barren: 0,
  };

  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index] ?? 0;
    const g = pixels[index + 1] ?? 0;
    const b = pixels[index + 2] ?? 0;
    const alpha = pixels[index + 3] ?? 0;

    if (alpha < 10) {
      continue;
    }

    const saturation = computeSaturation(r, g, b);
    const brightness = r + g + b;

    if (g > r * 1.1 && g > b * 1.1 && g > 60) {
      counts.vegetation += 1;
      continue;
    }

    if (b > r * 1.1 && b > g * 1.1 && brightness < 400) {
      counts.water += 1;
      continue;
    }

    if (saturation < 0.15 && brightness > 200) {
      counts.urban += 1;
      continue;
    }

    counts.barren += 1;
  }

  const total = counts.vegetation + counts.water + counts.urban + counts.barren;
  const buckets: LandCoverBucket[] = [
    { label: "Vegetation", value: total ? Math.round((counts.vegetation / total) * 100) : 0, confidence: 0.52, color: "#5be49b" },
    { label: "Water", value: total ? Math.round((counts.water / total) * 100) : 0, confidence: 0.48, color: "#00e5ff" },
    { label: "Urban", value: total ? Math.round((counts.urban / total) * 100) : 0, confidence: 0.44, color: "#a8b8c8" },
    { label: "Barren/Industrial", value: total ? Math.round((counts.barren / total) * 100) : 0, confidence: 0.4, color: "#ffab00" },
  ]
    .filter((bucket) => bucket.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    summary: `Client-side RGB histogram estimate for ${file.name}. Values are heuristic approximations - not a validated remote-sensing classification.`,
    buckets,
  };
}

export function ImageUpload({ onClassify, previewUrl }: ImageUploadProps) {
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    setFileName(file.name);
    setError(null);

    try {
      const result = await classifyImage(file);
      onClassify(result.summary, result.buckets, url);
    } catch (cause) {
      URL.revokeObjectURL(url);
      setError(
        cause instanceof Error
          ? cause.message
          : "GeoSight could not analyze this image on-device.",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Satellite image upload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[color:var(--accent-strong)] bg-[var(--accent-soft)] px-4 py-6 text-sm text-[var(--foreground-soft)]">
          <Upload className="h-4 w-4 text-[var(--accent)]" />
          <span>{fileName || "Upload PNG, JPG, or TIFF imagery for land cover classification."}</span>
          <Input type="file" accept=".png,.jpg,.jpeg,.tif,.tiff" className="hidden" aria-label="Upload satellite imagery for classification" onChange={handleFile} />
        </label>

        {previewUrl ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-[color:var(--border-soft)]">
              <Image
                src={previewUrl}
                alt="Uploaded satellite preview"
                width={720}
                height={420}
                className="h-52 w-full object-cover"
                unoptimized
              />
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              RGB histogram estimate - not a validated remote-sensing classification.
            </p>
          </div>
        ) : null}

        {error ? <p className="text-xs text-[var(--danger-foreground)]">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
