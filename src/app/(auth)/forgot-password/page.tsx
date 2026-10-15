import Link from "next/link";
import { ForgotForm } from "../forms";

export const metadata = { title: "Forgot password · Pulse Sales" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-sm text-muted">We&apos;ll email you a link to choose a new one.</p>
      <ForgotForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
