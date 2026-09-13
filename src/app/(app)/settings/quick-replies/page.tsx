import { Metadata } from "next";
import { QuickRepliesClient } from "@/components/settings/quick-replies-client";

export const metadata: Metadata = {
  title: "Respuestas Rápidas | Configuración",
  description: "Administra atajos de texto predefinidos para responder ágilmente en el chat",
};

export default function QuickRepliesPage() {
  return <QuickRepliesClient />;
}
