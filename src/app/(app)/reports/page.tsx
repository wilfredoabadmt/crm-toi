import { Metadata } from "next";
import { ReportsClient } from "@/components/reports/reports-client";

export const metadata: Metadata = {
  title: "Reportes y Métricas | CRM TOI",
  description:
    "Métricas en tiempo real de atención, automatización de IA, horas pico y rendimiento comercial",
};

export default function ReportsPage() {
  return <ReportsClient />;
}
