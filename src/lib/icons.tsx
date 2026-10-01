import {
  Briefcase,
  CheckCheck,
  FileBadge,
  FileCheck2,
  FileCog,
  FileEdit,
  FileSearch,
  Fingerprint,
  Landmark,
  type LucideIcon,
  Phone,
  Printer,
  Receipt,
  Scale,
  Search,
  ShieldAlert,
  Tv,
  Unlink,
  UserCheck,
  UserPlus,
  Wifi,
  Zap,
} from "lucide-react";

export const serviceIcons: Record<string, LucideIcon> = {
  "id-badge": Fingerprint,
  landmark: Landmark,
  "file-edit": FileEdit,
  "file-cog": FileCog,
  briefcase: Briefcase,
  receipt: Receipt,
  phone: Phone,
  wifi: Wifi,
  zap: Zap,
  tv: Tv,
  "check-check": CheckCheck,
  "user-plus": UserPlus,
  "file-search": FileSearch,
  "shield-alert": ShieldAlert,
  "user-check": UserCheck,
  unlink: Unlink,
  "file-check-2": FileCheck2,
  search: Search,
  scale: Scale,
  "file-badge": FileBadge,
  printer: Printer,
};

export function getServiceIcon(icon: string): LucideIcon {
  return serviceIcons[icon] ?? Fingerprint;
}

export function ServiceIcon({
  icon,
  size = 18,
  strokeWidth = 1.8,
  className,
}: {
  icon: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon = serviceIcons[icon] ?? Fingerprint;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
}
