import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { TeamClient } from "@/components/settings/team-client";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "owner") {
    redirect("/settings/profile");
  }

  return <TeamClient />;
}
