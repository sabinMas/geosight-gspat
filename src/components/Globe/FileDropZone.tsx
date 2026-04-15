"use client";

import {
  forwardRef,
  type ReactNode,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Upload } from "lucide-react";
import { parseGeoFile, type ImportedLayer } from "@/lib/file-import";

export interface FileDropZoneHandle {
  openFilePicker: () => void;
}

interface FileDropZoneProps {
  children: ReactNode;
  onImportLayer: (layer: ImportedLayer) => void;
  onImportError?: (message: string) => void;
}

const ACCEPTED_FILE_TYPES = ".geojson,.json,.kml,.csv,.gpx";

export const FileDropZone = forwardRef<FileDropZoneHandle, FileDropZoneProps>(
  function FileDropZone({ children, onImportLayer, onImportError }, ref) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const dragDepthRef = useRef(0);
    const [dragActive, setDragActive] = useState(false);
    const [importing, setImporting] = useState(false);

    const openFilePicker = useCallback(() => {
      inputRef.current?.click();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        openFilePicker,
      }),
      [openFilePicker],
    );

    const importFiles = useCallback(
      async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) {
          return;
        }

        setImporting(true);

        try {
          for (const file of Array.from(fileList)) {
            try {
              const layer = await parseGeoFile(file);
              onImportLayer(layer);
            } catch (error) {
              onImportError?.(
                error instanceof Error
                  ? `Couldn't import ${file.name}. ${error.message}`
                  : `Couldn't import ${file.name}.`,
              );
            }
          }
        } finally {
          setImporting(false);
        }
      },
      [onImportError, onImportLayer],
    );

    return (
      <div
        className="relative h-full w-full"
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepthRef.current += 1;
          setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepthRef.current = Math.max(dragDepthRef.current - 1, 0);
          if (dragDepthRef.current === 0) {
            setDragActive(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepthRef.current = 0;
          setDragActive(false);
          void importFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          className="sr-only"
          multiple
          onChange={(event) => {
            void importFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />

        {children}

        {dragActive || importing ? (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center p-4">
            <div className="flex h-full w-full items-center justify-center rounded-[2rem] border-2 border-dashed border-[color:var(--accent)] bg-[var(--surface-overlay)] shadow-[var(--shadow-panel)] backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 rounded-[1.5rem] border border-[color:var(--accent-strong)] bg-[var(--surface-panel)] px-6 py-5 text-center shadow-[var(--shadow-panel)]">
                <Upload className="h-6 w-6 text-[var(--accent)]" />
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    {importing ? "Importing geospatial files..." : "Drop GeoJSON, KML, CSV, or GPX"}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    GeoSight will add each file as a new layer on the globe.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);
