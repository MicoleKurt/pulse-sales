import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { sha256 } from "@/lib/crypto";
import { ROLE_LABEL } from "@/lib/rights";
import { ActionForm, SubmitButton } from "@/components/form";
import { Alert, LinkButton } from "@/components/ui";
import { acceptInvite, logout } from "../../actions";

export const metadata = { title: "Join team · Pulse Sales" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv] = await db
    .select({ inv: schema.invitations, orgName: schema.organizations.name })
    .from(schema.invitations)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.invitations.organizationId))
    .where(and(eq(schema.invitations.tokenHash, sha256(token)), gt(schema.invitations.expiresAt, new Date()), isNull(schema.invitations.acceptedAt)));

  if (!inv) return <Alert>This invitation is invalid, already used, or expired. Ask your admin to send a new one.</Alert>;

  const session = await getSession();
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">Join {inv.orgName}</h1>
      <p className="mt-1 text-sm text-muted">
        You&apos;ve been invited as <strong>{ROLE_LABEL[inv.inv.role]}</strong> ({inv.inv.email}).
      </p>
      <div className="mt-8 space-y-3">
        {session ? (
          <>
            <ActionForm action={acceptInvite} className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <SubmitButton variant="solid" className="w-full">Accept invitation</SubmitButton>
            </ActionForm>
            <form action={logout}>
              <button className="w-full text-center text-sm text-muted hover:text-text">Not {session.user.email}? Sign out</button>
            </form>
          </>
        ) : (
          <>
            <LinkButton href={`/signup?invite=${token}&email=${encodeURIComponent(inv.inv.email)}`} variant="solid" className="w-full">
              Create account
            </LinkButton>
            <LinkButton href={`/login?next=/invite/${token}`} variant="secondary" className="w-full">
              I already have an account
            </LinkButton>
          </>
        )}
      </div>
    </>
  );
}
