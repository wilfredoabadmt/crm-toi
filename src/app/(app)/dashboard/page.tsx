import { Metadata } from "next";
import { ReportsClient } from "@/components/reports/reports-client";

export const metadata: Metadata = {
  title: "Dashboard | CRM TOI",
  description:
    "Tablero principal de control, métricas de atención, horas pico y rendimiento del equipo",
};

export default function DashboardPage() {
  return <ReportsClient />;
}
