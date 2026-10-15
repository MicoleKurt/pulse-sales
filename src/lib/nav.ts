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

export type NavItem = { href: string; label: string; icon: LucideIcon; description: string };
export type NavSection = { title: string; items: NavItem[] };

export const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Revenue, sales and team performance at a glance." },
      { href: "/sales", label: "Sales", icon: ReceiptText, description: "Create, edit and track sales transactions and line items." },
      { href: "/reports", label: "Reports", icon: BarChart3, description: "Sales by period, product, rep and customer, with exports." },
    ],
  },
  {
    title: "Lookups",
    items: [
      { href: "/customers", label: "Customers", icon: Contact, description: "Customer directory with purchase history." },
      { href: "/team", label: "Team", icon: Users, description: "Sales reps and their performance." },
      { href: "/products", label: "Products", icon: Box, description: "Product catalog and units." },
      { href: "/prices", label: "Price history", icon: Tag, description: "Effective-dated product prices." },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/rights", label: "Team & rights", icon: ShieldCheck, description: "Invite members, manage roles and the rights matrix." },
      { href: "/deleted", label: "Deleted items", icon: Trash2, description: "Restore soft-deleted sales and line items." },
      { href: "/audit-log", label: "Audit log", icon: ScrollText, description: "Every change, who made it and when." },
      { href: "/settings", label: "Settings", icon: Settings, description: "Organization profile, currency, tax and billing." },
    ],
  },
];

export const allNavItems = navSections.flatMap((s) => s.items);

