import { Metadata } from "next";
import { AppointmentsClient } from "@/components/appointments/appointments-client";

export const metadata: Metadata = {
  title: "Agenda y Citas | CRM",
  description: "Gestión y calendario de visitas técnicas, instalaciones y reuniones con confirmación por WhatsApp",
};

export default function AppointmentsPage() {
  return <AppointmentsClient />;
}
