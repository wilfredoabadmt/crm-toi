import { Metadata } from "next";
import { TagsClient } from "@/components/settings/tags-client";

export const metadata: Metadata = {
  title: "Etiquetas (Tags) | Configuración",
  description: "Crea y administra etiquetas para clasificar contactos y segmentar campañas",
};

export default function TagsPage() {
  return <TagsClient />;
}
