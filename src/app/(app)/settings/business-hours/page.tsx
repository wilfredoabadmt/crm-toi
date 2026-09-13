import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/lib/auth/session";
import { BusinessHoursClient } from "@/components/settings/business-hours-client";

export const metadata: Metadata = {
  title: "Horarios de Atención | Configuración",
  description:
    "Configura los días, horas de atención de tu empresa y respuestas automáticas de ausencia fuera de horario",
};

export const dynamic = "force-dynamic";

export default async function BusinessHoursPage() {
  const session = await getSessionOrNull();
  if (!session || session.role !== "owner") {
    redirect("/settings/profile");
  }

  return <BusinessHoursClient />;
}
