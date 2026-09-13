import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { WhatsappWizard } from "@/components/settings/whatsapp-wizard";

export const dynamic = "force-dynamic";

export default async function WhatsappSettingsPage() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "owner") {
    redirect("/settings/profile");
  }

  return <WhatsappWizard />;
}
