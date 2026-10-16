/**
 * Absolute base URL for links in emails and Stripe redirects.
 * APP_URL wins; on Vercel, previews use their branch URL and production its production domain.
 */
export function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : (process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL);
  return host ? `https://${host}` : "http://localhost:3000";
}
