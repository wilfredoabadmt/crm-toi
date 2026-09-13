"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TabItem {
  href: string;
  label: string;
  ownerOnly?: boolean;
}

const TABS: TabItem[] = [
  { href: "/settings/profile", label: "Mi Perfil" },
  { href: "/settings/quick-replies", label: "Respuestas Rápidas" },
  { href: "/settings/tags", label: "Etiquetas (Tags)" },
  { href: "/settings/whatsapp", label: "WhatsApp", ownerOnly: true },
  { href: "/settings/branding", label: "Marca", ownerOnly: true },
  { href: "/settings/templates", label: "Plantillas", ownerOnly: true },
  { href: "/settings/business-hours", label: "Horarios de Atención", ownerOnly: true },
  { href: "/settings/team", label: "Equipo", ownerOnly: true },
];

export function SettingsNav({ role }: { role: string }) {
  const pathname = usePathname();
  const visibleTabs = TABS.filter((t) => !t.ownerOnly || role === "owner");

  return (
    <nav className="w-48 shrink-0 space-y-1 border-r p-3">
      {visibleTabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith(t.href)
              ? "bg-brand-tint text-brand-text font-semibold"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
