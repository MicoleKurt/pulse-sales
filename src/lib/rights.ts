import type { Role } from "@/db/schema";

// Granular rights, ported from HOPE's 13-right matrix and extended for SaaS.
export const RIGHTS = {
  SALES_VIEW: "View own sales",
  SALES_VIEW_ALL: "View every rep's sales",
  SALES_ADD: "Create sales",
  SALES_EDIT: "Edit sales and line items",
  SALES_DEL: "Delete and restore sales",
  LOOKUP_VIEW: "View customers, products and prices",
  LOOKUP_EDIT: "Edit customers, products and prices",
  REPORT_VIEW: "View reports",
  EXPORT: "Export data (CSV, XLSX, PDF)",
  TEAM_ADMIN: "Invite members and manage rights",
  BILLING_ADMIN: "Manage billing and organization settings",
  AUDIT_VIEW: "View the audit log",
} as const;

export type Right = keyof typeof RIGHTS;
export const ALL_RIGHTS = Object.keys(RIGHTS) as Right[];
export const ROLES: Role[] = ["owner", "admin", "manager", "rep"];

export const DEFAULT_RIGHTS: Record<Role, Right[]> = {
  owner: ALL_RIGHTS,
  admin: ALL_RIGHTS.filter((r) => r !== "BILLING_ADMIN"),
  manager: ["SALES_VIEW", "SALES_VIEW_ALL", "SALES_ADD", "SALES_EDIT", "LOOKUP_VIEW", "LOOKUP_EDIT", "REPORT_VIEW", "EXPORT"],
  rep: ["SALES_VIEW", "SALES_ADD", "SALES_EDIT", "LOOKUP_VIEW"],
};

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  rep: "Sales rep",
};
