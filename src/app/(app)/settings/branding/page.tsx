import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { BrandingClient } from "@/components/settings/branding-client";

export const dynamic = "force-dynamic";

export default async function BrandingSettingsPage() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "owner") {
    redirect("/settings/profile");
  }

  return <BrandingClient />;
}
