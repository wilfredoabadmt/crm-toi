import { Metadata } from "next";
import { BusinessHoursClient } from "@/components/settings/business-hours-client";

export const metadata: Metadata = {
  title: "Horarios de Atención | Configuración",
  description:
    "Configura los días, horas de atención de tu empresa y respuestas automáticas de ausencia fuera de horario",
};

export default function BusinessHoursPage() {
  return <BusinessHoursClient />;
}
