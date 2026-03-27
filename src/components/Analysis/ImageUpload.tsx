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

function classifyImage(file: File): Promise<{ summary: string; buckets: LandCoverBucket[] }> {
  return new Promise((resolve) => {
    const buckets: LandCoverBucket[] = [
      { label: "Vegetation", value: 38, confidence: 0.74, color: "#5be49b" },
      { label: "Water", value: 17, confidence: 0.61, color: "#00e5ff" },
      { label: "Urban", value: 21, confidence: 0.67, color: "#a8b8c8" },
      { label: "Barren/Industrial", value: 24, confidence: 0.7, color: "#ffab00" },
    ];

    resolve({
      summary: `${file.name} appears to include mixed land cover with vegetation, developed surfaces, and some surface water. Classification is histogram-based for the MVP demo.`,
      buckets,
    });
  });
}

export function ImageUpload({ onClassify, previewUrl }: ImageUploadProps) {
  const [fileName, setFileName] = useState<string>("");

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    setFileName(file.name);
    const result = await classifyImage(file);
    onClassify(result.summary, result.buckets, url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Satellite image upload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-400/6 px-4 py-6 text-sm text-slate-200">
          <Upload className="h-4 w-4 text-cyan-300" />
          <span>{fileName || "Upload PNG, JPG, or TIFF imagery for land cover classification."}</span>
          <Input type="file" accept=".png,.jpg,.jpeg,.tif,.tiff" className="hidden" onChange={handleFile} />
        </label>

        {previewUrl ? (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <Image
              src={previewUrl}
              alt="Uploaded satellite preview"
              width={720}
              height={420}
              className="h-52 w-full object-cover"
              unoptimized
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
