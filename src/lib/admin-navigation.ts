import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  LayoutDashboard,
  Users,
} from "lucide-react";

export type AdminNavigationItem = {
  label: "Dashboard" | "Requests" | "Customers" | "Workers";
  href:
    | "/admin"
    | "/admin/requests"
    | "/admin/customers"
    | "/admin/workers";
  icon: LucideIcon;
};

export const ADMIN_NAV_ITEMS: readonly AdminNavigationItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Requests", href: "/admin/requests", icon: ClipboardList },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Workers", href: "/admin/workers", icon: Users },
];

export function isAdminNavigationItemActive(
  pathname: string,
  href: AdminNavigationItem["href"],
): boolean {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
