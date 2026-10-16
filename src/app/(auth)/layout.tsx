import Link from "next/link";
import { Activity } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar-bg p-10 text-sidebar-fg lg:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-white/15">
            <Activity className="size-4" />
          </span>
          Pulse Sales
        </Link>
        <div>
          <p className="max-w-md text-3xl font-semibold leading-tight">Every sale, every rep, every number. In one place.</p>
          <p className="mt-4 max-w-md text-white/70">Track transactions, manage your team&apos;s permissions and see revenue in real time.</p>
        </div>
        <p className="text-sm text-white/50">© {new Date().getFullYear()} Pulse Sales</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
