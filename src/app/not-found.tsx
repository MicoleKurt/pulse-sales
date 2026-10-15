import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-muted">It may have been moved or deleted, or you don&apos;t have access.</p>
        <LinkButton href="/dashboard" className="mt-6">Back to dashboard</LinkButton>
      </div>
    </div>
  );
}
