"use client";

function sanitizeFileSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "export";
}

export function buildExportFilename(parts: string[], extension: string) {
  const safeParts = parts.map(sanitizeFileSegment).filter(Boolean);
  return `${safeParts.join("-")}.${extension.replace(/^\./, "")}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function downloadTextFile(contents: string, filename: string, contentType = "text/plain;charset=utf-8") {
  downloadBlob(new Blob([contents], { type: contentType }), filename);
}

export function downloadJsonFile(payload: unknown, filename: string) {
  downloadTextFile(JSON.stringify(payload, null, 2), filename, "application/json;charset=utf-8");
}

function escapeCsvCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

export function downloadCsvFile(rows: Array<Array<string | number | null | undefined>>, filename: string) {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  downloadTextFile(csv, filename, "text/csv;charset=utf-8");
}
