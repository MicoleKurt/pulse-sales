import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "../forms";

export const metadata: Metadata = { title: "Sign in · Pulse Sales" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to your workspace.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
