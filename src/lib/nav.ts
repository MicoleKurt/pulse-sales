import {
  BarChart3,
  Box,
  Contact,
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  Tag,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Right } from "./rights";

export type NavItem = { href: string; label: string; icon: LucideIcon; right?: Right };
export type NavSection = { title: string; items: NavItem[] };

export const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/sales", label: "Sales", icon: ReceiptText, right: "SALES_VIEW" },
      { href: "/reports", label: "Reports", icon: BarChart3, right: "REPORT_VIEW" },
    ],
  },
  {
    title: "Lookups",
    items: [
      { href: "/customers", label: "Customers", icon: Contact, right: "LOOKUP_VIEW" },
      { href: "/team", label: "Team", icon: Users, right: "SALES_VIEW_ALL" },
      { href: "/products", label: "Products", icon: Box, right: "LOOKUP_VIEW" },
      { href: "/prices", label: "Price history", icon: Tag, right: "LOOKUP_VIEW" },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/rights", label: "Team & rights", icon: ShieldCheck, right: "TEAM_ADMIN" },
      { href: "/deleted", label: "Deleted items", icon: Trash2, right: "SALES_DEL" },
      { href: "/audit-log", label: "Audit log", icon: ScrollText, right: "AUDIT_VIEW" },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const allNavItems = navSections.flatMap((s) => s.items);
