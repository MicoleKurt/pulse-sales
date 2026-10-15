// Marketing copy for plans. Enforced limits live in the plan_limits table (editable in /admin/plans).
export const PLAN_FEATURES = {
  free: ["1 seat", "100 sales / month", "Dashboard & basic reports", "Customers, products, price history"],
  pro: ["Up to 25 seats", "Unlimited sales", "CSV / XLSX / PDF exports", "Rights matrix & invites", "Email support"],
  business: ["Unlimited seats", "Everything in Pro", "Reports by product & customer", "Full audit log", "Priority support"],
} as const;

export const DEFAULT_PLAN_LIMITS = [
  { plan: "free" as const, pricePerSeat: 0, maxSeats: 1, maxSalesPerMonth: 100, exports: false, auditLog: false, advancedReports: false },
  { plan: "pro" as const, pricePerSeat: 19, maxSeats: 25, maxSalesPerMonth: null, exports: true, auditLog: false, advancedReports: false },
  { plan: "business" as const, pricePerSeat: 39, maxSeats: null, maxSalesPerMonth: null, exports: true, auditLog: true, advancedReports: true },
];
