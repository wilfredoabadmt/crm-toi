import { Metadata } from "next";
import { UserProfileClient } from "@/components/settings/user-profile-client";

export const metadata: Metadata = {
  title: "Mi Perfil | Configuración",
  description: "Gestiona tus datos personales, contraseña y preferencias de cuenta",
};

export const dynamic = "force-dynamic";

export default function UserProfilePage() {
  return <UserProfileClient />;
}
