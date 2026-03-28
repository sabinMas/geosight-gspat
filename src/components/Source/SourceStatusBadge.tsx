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
      className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${getSourceStatusTone(
        source.status,
      )}`}
    >
      {formatSourceStatusLabel(source.status)}
    </span>
  );
}
