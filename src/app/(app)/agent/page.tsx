import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { hasSectionAccess } from "@/lib/permissions";
import { AgentClient } from "@/components/agent/agent-client";

export const dynamic = "force-dynamic";

export default async function AgentPage() {
  const session = await getSessionOrNull();
  if (session && !hasSectionAccess(session.role, session.permissions, "agent")) {
    redirect("/inbox");
  }

  return <AgentClient />;
}

