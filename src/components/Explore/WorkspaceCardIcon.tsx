import {
  Activity,
  BarChart3,
  CloudSun,
  Columns3,
  Droplets,
  Gauge,
  GraduationCap,
  ImagePlus,
  Layers,
  Leaf,
  LineChart,
  MapPin,
  MessageSquare,
  Mountain,
  PanelsTopLeft,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table2,
  Trees,
  TrendingUp,
  TriangleAlert,
  Users,
  Waves,
  Wifi,
  Wind,
  LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  BarChart3,
  CloudSun,
  Columns3,
  Droplets,
  Gauge,
  GraduationCap,
  ImagePlus,
  Layers,
  Leaf,
  LineChart,
  MapPin,
  MessageSquare,
  Mountain,
  PanelsTopLeft,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table2,
  Trees,
  TrendingUp,
  TriangleAlert,
  Users,
  Waves,
  Wifi,
  Wind,
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
