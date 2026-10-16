import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "../forms";

export const metadata: Metadata = { title: "Create account · Pulse Sales" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ invite?: string; email?: string }> }) {
  const { invite, email } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted">{invite ? "Create an account to join your team." : "Start your 14-day Pro trial. No card required."}</p>
      <SignupForm invite={invite} email={email} />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
