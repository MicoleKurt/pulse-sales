"use client";

import { AlertTriangle } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-danger/10 text-danger">
        <AlertTriangle className="size-6" />
      </span>
      <h2 className="mt-4 font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm text-muted">The page failed to load. Try again, and if it keeps happening contact support{error.digest ? ` with code ${error.digest}` : ""}.</p>
      <Button className="mt-5" onClick={reset}>Try again</Button>
    </Card>
  );
}
