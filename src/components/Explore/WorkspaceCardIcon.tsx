import {
  BarChart3,
  Columns3,
  Gauge,
  GraduationCap,
  ImagePlus,
  Leaf,
  LineChart,
  MapPin,
  MessageSquare,
  Mountain,
  PanelsTopLeft,
  Sparkles,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  Columns3,
  Gauge,
  GraduationCap,
  ImagePlus,
  Leaf,
  LineChart,
  MapPin,
  MessageSquare,
  Mountain,
  PanelsTopLeft,
  Sparkles,
  ShieldCheck,
};

export function WorkspaceCardIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Icon = ICON_MAP[icon] ?? PanelsTopLeft;
  return <Icon className={className} />;
}
