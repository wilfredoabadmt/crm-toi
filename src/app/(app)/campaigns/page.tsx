import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { hasSectionAccess } from "@/lib/permissions";
import { CampaignsClient } from "@/components/campaigns/campaigns-client";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");
  if (!hasSectionAccess(session.role, session.permissions, "campaigns")) {
    redirect("/inbox");
  }

  return <CampaignsClient userRole={session.role} />;
}
