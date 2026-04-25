import {
  formatSourceStatusLabel,
  getSourceStatusTone,
} from "@/lib/source-metadata";
import { DataSourceMeta } from "@/types";

interface SourceStatusBadgeProps {
  source: DataSourceMeta;
}

export function SourceStatusBadge({ source }: SourceStatusBadgeProps) {
  return (
    <span
      className={`inline-block max-w-[12rem] truncate whitespace-nowrap rounded-full border px-2 py-1 text-xs uppercase tracking-[0.18em] ${getSourceStatusTone(
        source.status,
      )}`}
    >
      {formatSourceStatusLabel(source.status)}
    </span>
  );
}
