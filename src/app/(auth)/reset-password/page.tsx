import Link from "next/link";
import { Alert } from "@/components/ui";
import { ResetForm } from "../forms";

export const metadata = { title: "Choose a new password · Pulse Sales" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token)
    return (
      <Alert>
        This reset link is missing its token.{" "}
        <Link href="/forgot-password" className="underline">
          Request a new one
        </Link>
        .
      </Alert>
    );
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <ResetForm token={token} />
    </>
  );
}
