"use client";

import { useEffect, useState } from "react";
import { Search, Sparkles, UserRound } from "lucide-react";
import type { ConversationDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  DEPARTMENTS,
  getDepartmentByStageName,
  isUserInDepartment,
  type DepartmentConfig,
} from "@/lib/departments";
import { ContactAvatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { formatTime, previewText } from "./helpers";
import type { CurrentUserProp } from "./inbox-client";

const STAGE_DOT: Record<string, string> = {
  Nuevo: "#9ca3af",
  "En conversación": "#7b93b3",
  Interesado: "#b08b5e",
  Cliente: "#5f8f74",
  Perdido: "#a2504c",
};

function EmptyState({ onSeeded }: { onSeeded: () => void }) {
  const [seeding, setSeeding] = useState(false);
  const [failed, setFailed] = useState(false);

  async function seed() {
    setSeeding(true);
    const res = await fetch("/api/seed/demo", { method: "POST" }).catch(
      () => null
    );
    setSeeding(false);
    if (res?.ok) onSeeded();
    else setFailed(true);
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium">Sin conversaciones todavía</p>
      <p className="text-xs text-text-3">
        Cuando alguien escriba a tu número de WhatsApp, su conversación
        aparecerá aquí en tiempo real.
      </p>
      {!failed && (
        <Button
          size="sm"
          variant="outline"
          disabled={seeding}
          onClick={() => void seed()}
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.7} />
          {seeding ? "Cargando demo…" : "Cargar datos de demostración"}
        </Button>
      )}
    </div>
  );
}

export function ConversationList({
  conversations: conversationsProp,
  selectedId,
  onSelect,
  onSeeded,
  currentUser,
}: {
  conversations: ConversationDto[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSeeded: () => void;
  currentUser?: CurrentUserProp;
}) {
  const [query, setQuery] = useState("");
  const [departments, setDepartments] = useState<DepartmentConfig[]>(DEPARTMENTS);
  const [filter, setFilter] = useState<string>("all");
  const [initialFilterSet, setInitialFilterSet] = useState(false);

  useEffect(() => {
    fetch("/api/settings/departments")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.departments && Array.isArray(data.departments)) {
          setDepartments(data.departments);
        }
      })
      .catch(() => null);
  }, []);

  const isOwner = currentUser?.role === "owner";
  const userEmail = (currentUser?.email ?? "").trim().toLowerCase();
  const myDepartments = departments.filter((d) =>
    isUserInDepartment(userEmail, d)
  );
  const myDepartment = myDepartments[0];

  // Auto-posicionar al miembro en su departamento al iniciar
  useEffect(() => {
    if (!initialFilterSet && departments.length > 0) {
      if (!isOwner && myDepartment) {
        setFilter(myDepartment.id);
      }
      setInitialFilterSet(true);
    }
  }, [initialFilterSet, departments, isOwner, myDepartment]);

  const loading = conversationsProp === null;
  const rawConversations = conversationsProp ?? [];

  // Si es un miembro con departamentos asignados (ej. Comercial, o Comercial + Técnico),
  // se enfoca en las conversaciones de sus áreas para privacidad y foco.
  const conversations =
    !isOwner && myDepartments.length > 0
      ? rawConversations.filter((c) => {
          const dep = getDepartmentByStageName(c.stageName, departments);
          return dep ? myDepartments.some((md) => md.id === dep.id) : true;
        })
      : rawConversations;

  const q = query.trim().toLowerCase();
  const searched = q
    ? conversations.filter(
        (c) =>
          c.contact.name.toLowerCase().includes(q) ||
          c.contact.phone.includes(q) ||
          (c.preview ?? "").toLowerCase().includes(q)
      )
    : conversations;
  const unreadCount = searched.filter((c) => c.unreadCount > 0).length;

  const filterTabs =
    !isOwner && myDepartments.length > 0
      ? [
          ...myDepartments.map((d) => {
            const isTitular = d.assignedEmail.toLowerCase() === userEmail;
            return {
              id: d.id,
              label: isTitular ? `${d.shortName} (Titular)` : d.shortName,
              count: searched.filter(
                (c) => getDepartmentByStageName(c.stageName, departments)?.id === d.id
              ).length,
              color: d.badgeColor,
            };
          }),
          { id: "unread", label: "No leídas", count: unreadCount },
        ]
      : [
          { id: "all", label: "Todas", count: searched.length },
          { id: "unread", label: "No leídas", count: unreadCount },
          ...departments.map((d) => ({
            id: d.id,
            label: `${d.shortName} (${d.assignedName})`,
            count: searched.filter(
              (c) => getDepartmentByStageName(c.stageName, departments)?.id === d.id
            ).length,
            color: d.badgeColor,
          })),
        ];

  const visible =
    filter === "all"
      ? searched
      : filter === "unread"
        ? searched.filter((c) => c.unreadCount > 0)
        : searched.filter(
            (c) => getDepartmentByStageName(c.stageName, departments)?.id === filter
          );

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-4 pb-3 pt-4">
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="text-[17px] font-[650] tracking-tight">Bandeja</h2>
          <span className="text-sm text-text-3">{conversations.length}</span>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-secondary px-3 py-[7px] transition-colors focus-within:border-brand focus-within:bg-background focus-within:ring-[3px] focus-within:ring-brand-soft">
          <Search className="h-4 w-4 shrink-0 text-text-3" strokeWidth={1.7} />
          <input
            placeholder="Buscar conversación…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-text-3"
          />
        </div>

        {/* Indicador de Área asignada para cuentas personales */}
        {!isOwner && myDepartments.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground">Tu área de atención:</span>
            {myDepartments.map((d) => {
              const isTitular = d.assignedEmail.toLowerCase() === userEmail;
              return (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10.5px] font-semibold"
                  style={{
                    backgroundColor: `${d.badgeColor}18`,
                    color: d.badgeColor,
                    border: `1px solid ${d.badgeColor}35`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: d.badgeColor }}
                  />
                  {d.name}
                  {isTitular && (
                    <span className="opacity-80 text-[9px]">(Titular)</span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </header>

      <div className="flex gap-1.5 overflow-x-auto border-b px-4 py-2.5 scrollbar-none">
        {filterTabs.map((f) => {
          const isSelected = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-[5px] text-[12px] font-medium transition-colors",
                isSelected
                  ? "border-brand bg-brand text-white"
                  : "bg-background text-text-2 hover:bg-accent"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10.5px]",
                  isSelected ? "bg-white/20 text-white" : "bg-secondary text-text-3"
                )}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-6 text-center text-xs text-text-3">Cargando…</p>
        ) : conversations.length === 0 ? (
          <EmptyState onSeeded={onSeeded} />
        ) : visible.length === 0 ? (
          <p className="p-6 text-center text-xs text-text-3">
            Sin resultados para este filtro.
          </p>
        ) : (
          <ul>
            {visible.map((c) => {
              const unread = c.unreadCount > 0;
              const active = selectedId === c.id;
              return (
                <li key={c.id} className="relative border-b border-border/70">
                  {active && (
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" />
                  )}
                  <button
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "flex w-full items-start gap-[11px] px-4 py-[var(--row-py)] text-left transition-colors",
                      active ? "bg-[var(--bg-active)]" : "hover:bg-subtle"
                    )}
                  >
                    <span className="relative shrink-0">
                      <ContactAvatar name={c.contact.name} seed={c.contact.id} size="lg" />
                      {c.windowOpen && (
                        <span className="absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-[2.5px] border-background bg-success" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            unread ? "font-[680]" : "font-semibold"
                          )}
                        >
                          {c.contact.name}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[11.5px]",
                            unread ? "font-semibold text-brand" : "text-text-3"
                          )}
                        >
                          {formatTime(c.lastMessageAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-[13px]",
                            unread ? "font-medium text-text-2" : "text-text-3"
                          )}
                        >
                          {previewText(c.preview)}
                        </span>
                        {unread && (
                          <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10.5px] font-semibold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {c.stageName && (() => {
                          const dep = getDepartmentByStageName(c.stageName, departments);
                          return (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                              style={
                                dep
                                  ? {
                                      borderColor: `${dep.badgeColor}40`,
                                      backgroundColor: `${dep.badgeColor}18`,
                                      color: dep.badgeColor,
                                    }
                                  : undefined
                              }
                            >
                              <span
                                className="h-[7px] w-[7px] rounded-full"
                                style={{
                                  background: dep ? dep.badgeColor : (STAGE_DOT[c.stageName] ?? "#9ca3af"),
                                }}
                              />
                              {dep ? `${dep.shortName} · ${dep.assignedName}` : c.stageName}
                            </span>
                          );
                        })()}
                        {c.handoffAt && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                            <UserRound className="h-3 w-3" strokeWidth={1.7} />
                            Atención humana
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
