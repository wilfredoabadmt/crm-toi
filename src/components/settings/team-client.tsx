"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Check, Plus, Trash2, UserMinus, UserPlus, Users, X } from "lucide-react";
import { ContactAvatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DepartmentConfig } from "@/lib/departments";

type Member = {
  id: string;
  role: string;
  name: string;
  email: string;
  createdAt: string;
};

export function TeamClient() {
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<DepartmentConfig[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<
    Record<string, { name: string; email: string; memberEmails: string[] }>
  >({});
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [savedAssignments, setSavedAssignments] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const refetch = useCallback(async () => {
    const [teamRes, depsRes] = await Promise.all([
      fetch("/api/settings/team").catch(() => null),
      fetch("/api/settings/departments").catch(() => null),
    ]);

    if (teamRes?.ok) {
      const data = (await teamRes.json()) as { members: Member[] };
      setMembers(data.members);
    }

    if (depsRes?.ok) {
      const data = (await depsRes.json()) as {
        departments: DepartmentConfig[];
      };
      setDepartments(data.departments);
      const initial: Record<
        string,
        { name: string; email: string; memberEmails: string[] }
      > = {};
      for (const d of data.departments) {
        const assigned = d.assignedEmail?.trim().toLowerCase();
        const existing = (d.memberEmails ?? []).map((e) => e.trim().toLowerCase());
        const merged = Array.from(new Set([assigned, ...existing])).filter(Boolean);
        initial[d.id] = {
          name: d.assignedName,
          email: d.assignedEmail,
          memberEmails: merged,
        };
      }
      setAssignments(initial);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  function generatePassword() {
    const alphabet =
      "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint32Array(14);
    crypto.getRandomValues(bytes);
    setTempPassword(
      Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
    );
  }

  async function create() {
    setSaving(true);
    setError(null);
    setCreated(null);
    const res = await fetch("/api/settings/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password: tempPassword }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo crear la cuenta");
      return;
    }
    setCreated({ email, password: tempPassword });
    setName("");
    setEmail("");
    setTempPassword("");
    void refetch();
  }

  async function deleteMember(member: Member) {
    const ok = window.confirm(
      `¿Estás seguro de que deseas eliminar a "${member.name}" (${member.email}) del equipo?\n\nPerderá acceso de inmediato al CRM y se removerá de todos los departamentos asignados.`
    );
    if (!ok) return;

    setDeletingId(member.id);
    const res = await fetch(`/api/settings/team?id=${member.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setDeletingId(null);

    if (res?.ok) {
      showFeedback(`Miembro "${member.name}" eliminado del equipo`);
      void refetch();
    } else {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      alert(data?.error?.message ?? "No se pudo eliminar al miembro");
    }
  }

  /** Guarda un mapa de asignaciones inmediatamente y actualiza el backend */
  async function persistAssignments(
    updated: Record<string, { name: string; email: string; memberEmails: string[] }>,
    successMsg?: string
  ) {
    setAssignments(updated);
    setSavingAssignments(true);
    const res = await fetch("/api/settings/departments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignments: updated }),
    }).catch(() => null);
    setSavingAssignments(false);

    if (res?.ok) {
      setSavedAssignments(true);
      if (successMsg) showFeedback(successMsg);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("departments-updated"));
      }
      void refetch();
      setTimeout(() => setSavedAssignments(false), 3000);
    } else {
      alert("No se pudieron guardar las asignaciones");
    }
  }

  /** Retorna los departamentos a los que pertenece un usuario */
  function getMemberDepartments(userEmail: string) {
    const lower = userEmail.trim().toLowerCase();
    return departments.filter((d) => {
      const assign = assignments[d.id];
      if (!assign) return false;
      if (assign.email.toLowerCase() === lower) return true;
      return (assign.memberEmails ?? []).some((e) => e.toLowerCase() === lower);
    });
  }

  /** Cambia el titular de un departamento y lo retira de otras áreas para evitar duplicados */
  function handleTitularChange(depId: string, memberEmail: string) {
    const member = members.find((m) => m.email.toLowerCase() === memberEmail.toLowerCase());
    if (!member) return;
    const lower = member.email.toLowerCase();

    // Validar si ya es titular de OTRO departamento
    const otherTitularDep = departments.find((d) => {
      if (d.id === depId) return false;
      const assign = assignments[d.id];
      return assign && assign.email.toLowerCase() === lower;
    });

    if (otherTitularDep) {
      alert(
        `"${member.name}" ya es el Responsable Titular de ${otherTitularDep.name}.\n\nPrimero debes nombrar a otro titular en ${otherTitularDep.shortName} antes de asignarlo como titular de esta área.`
      );
      return;
    }

    const updated: typeof assignments = {};
    for (const [dId, val] of Object.entries(assignments)) {
      if (dId === depId) {
        const updatedEmails = Array.from(new Set([lower, ...val.memberEmails]));
        updated[dId] = {
          name: member.name,
          email: member.email,
          memberEmails: updatedEmails,
        };
      } else {
        // Retirar de cualquier otro departamento para garantizar exclusividad de 1 área por persona
        updated[dId] = {
          ...val,
          memberEmails: val.memberEmails.filter((e) => e.toLowerCase() !== lower),
        };
      }
    }

    const depName = departments.find((d) => d.id === depId)?.name ?? depId;
    void persistAssignments(updated, `Titular de ${depName} actualizado a ${member.name}`);
  }

  /** Agrega a un miembro a un departamento, removiéndolo de cualquier otra área previa */
  function handleAddMemberToDepartment(depId: string, memberEmail: string) {
    const lower = memberEmail.trim().toLowerCase();
    const current = assignments[depId];
    if (!current) return;

    const member = members.find((m) => m.email.toLowerCase() === lower);
    const depConfig = departments.find((d) => d.id === depId);
    const depName = depConfig?.shortName ?? depId;

    // Si es titular en otra área, advertir
    const otherTitularDep = departments.find((d) => {
      if (d.id === depId) return false;
      const assign = assignments[d.id];
      return assign && assign.email.toLowerCase() === lower;
    });

    if (otherTitularDep) {
      alert(
        `"${member?.name ?? memberEmail}" es el Responsable Titular de ${otherTitularDep.name}.\n\nPrimero debes nombrar a otro titular en ${otherTitularDep.shortName} antes de moverlo a esta área.`
      );
      return;
    }

    // Mover limpiamente a esta área y quitar de cualquier otra
    const updated: typeof assignments = {};
    for (const [dId, val] of Object.entries(assignments)) {
      if (dId === depId) {
        const set = new Set(val.memberEmails.map((e) => e.toLowerCase()));
        set.add(lower);
        updated[dId] = { ...val, memberEmails: Array.from(set) };
      } else {
        updated[dId] = {
          ...val,
          memberEmails: val.memberEmails.filter((e) => e.toLowerCase() !== lower),
        };
      }
    }

    void persistAssignments(updated, `${member?.name ?? memberEmail} asignado a ${depName}`);
  }

  /** Elimina a un miembro de un departamento específico */
  function handleRemoveMemberFromDepartment(depId: string, memberEmail: string) {
    const lower = memberEmail.trim().toLowerCase();
    const current = assignments[depId];
    if (!current) return;

    const dep = departments.find((d) => d.id === depId);
    const member = members.find((m) => m.email.toLowerCase() === lower);
    const isTitular = current.email.toLowerCase() === lower;

    if (isTitular) {
      alert(
        `"${member?.name ?? memberEmail}" es el Responsable Titular de ${dep?.name ?? depId}.\n\nPara poder retirarlo de este departamento, primero debes seleccionar a otro Responsable Titular en el menú superior.`
      );
      return;
    }

    const set = new Set(current.memberEmails.map((e) => e.toLowerCase()));
    set.delete(lower);

    const updated = {
      ...assignments,
      [depId]: {
        ...current,
        memberEmails: Array.from(set),
      },
    };
    void persistAssignments(updated, `${member?.name ?? memberEmail} retirado de ${dep?.shortName ?? depId}`);
  }

  /** Mueve a un miembro de un departamento a otro en 1 clic */
  function handleMoveMemberBetweenDepartments(
    memberEmail: string,
    fromDepId: string,
    toDepId: string
  ) {
    if (fromDepId === toDepId) return;
    const lower = memberEmail.trim().toLowerCase();
    const fromDep = assignments[fromDepId];
    const toDep = assignments[toDepId];
    if (!fromDep || !toDep) return;

    const fromDepConfig = departments.find((d) => d.id === fromDepId);
    const toDepConfig = departments.find((d) => d.id === toDepId);
    const member = members.find((m) => m.email.toLowerCase() === lower);

    if (fromDep.email.toLowerCase() === lower) {
      alert(
        `"${member?.name ?? memberEmail}" es el Responsable Titular de ${fromDepConfig?.name ?? fromDepId}.\n\nPara moverlo a otro departamento, primero asigna a un nuevo Responsable Titular en ${fromDepConfig?.shortName ?? fromDepId}.`
      );
      return;
    }

    // 1. Quitar del origen
    const fromSet = new Set(fromDep.memberEmails.map((e) => e.toLowerCase()));
    fromSet.delete(lower);

    // 2. Agregar al destino
    const toSet = new Set(toDep.memberEmails.map((e) => e.toLowerCase()));
    toSet.add(lower);

    const updated = {
      ...assignments,
      [fromDepId]: {
        ...fromDep,
        memberEmails: Array.from(fromSet),
      },
      [toDepId]: {
        ...toDep,
        memberEmails: Array.from(toSet),
      },
    };

    void persistAssignments(
      updated,
      `${member?.name ?? memberEmail} cambiado de ${fromDepConfig?.shortName} a ${toDepConfig?.shortName}`
    );
  }

  /** Cambia el departamento principal de un miembro desde la lista general */
  function handleReassignMemberFromMemberList(memberEmail: string, targetValue: string) {
    if (!targetValue) return;
    const lower = memberEmail.trim().toLowerCase();
    const member = members.find((m) => m.email.toLowerCase() === lower);

    // Caso A: Quitar de todos los departamentos
    if (targetValue === "none") {
      const isTitularAnywhere = departments.some((d) => {
        const assign = assignments[d.id];
        return assign && assign.email.toLowerCase() === lower;
      });

      if (isTitularAnywhere) {
        alert(
          `"${member?.name ?? memberEmail}" es Responsable Titular en uno o más departamentos.\n\nCambia primero el titular de esas áreas antes de quitarlo de todos los departamentos.`
        );
        return;
      }

      const updated: typeof assignments = {};
      for (const [depId, val] of Object.entries(assignments)) {
        updated[depId] = {
          ...val,
          memberEmails: val.memberEmails.filter((e) => e.toLowerCase() !== lower),
        };
      }
      void persistAssignments(updated, `${member?.name ?? memberEmail} retirado de todos los departamentos`);
      return;
    }

    // Caso B: Mover exclusivamente a targetValue
    const targetDep = assignments[targetValue];
    if (!targetDep) return;
    const targetConfig = departments.find((d) => d.id === targetValue);

    // Verificar si es titular en otros departamentos
    const titularInOther = departments.find((d) => {
      if (d.id === targetValue) return false;
      const assign = assignments[d.id];
      return assign && assign.email.toLowerCase() === lower;
    });

    if (titularInOther) {
      alert(
        `"${member?.name ?? memberEmail}" es Responsable Titular de ${titularInOther.name}.\n\nPara cambiarlo de departamento, primero asigna a otro titular en ${titularInOther.shortName}.`
      );
      return;
    }

    const updated: typeof assignments = {};
    for (const [depId, val] of Object.entries(assignments)) {
      if (depId === targetValue) {
        const set = new Set(val.memberEmails.map((e) => e.toLowerCase()));
        set.add(lower);
        updated[depId] = { ...val, memberEmails: Array.from(set) };
      } else {
        updated[depId] = {
          ...val,
          memberEmails: val.memberEmails.filter((e) => e.toLowerCase() !== lower),
        };
      }
    }

    void persistAssignments(
      updated,
      `${member?.name ?? memberEmail} asignado a ${targetConfig?.name ?? targetValue}`
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Notificación de retroalimentación de acción */}
      {actionFeedback && (
        <div className="sticky top-4 z-50 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm backdrop-blur dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{actionFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. Crear cuenta */}
      <Card>
        <CardHeader>
          <CardTitle>Crear cuenta de equipo</CardTitle>
          <CardDescription>
            Sin correos ni invitaciones: comparte tú mismo la contraseña
            temporal con tu compañero (se muestra UNA sola vez).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="team-name">Nombre</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-email">Correo</Label>
              <Input
                id="team-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="team-password">Contraseña temporal</Label>
            <div className="flex gap-2">
              <Input
                id="team-password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="mínimo 8 caracteres"
              />
              <Button variant="outline" onClick={generatePassword}>
                Generar
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {created && (
            <div className="rounded-md border border-[#d8e8dd] bg-[#eff7f1] p-3 text-sm">
              <p className="font-medium text-[#3f6b52]">Cuenta creada ✓</p>
              <p className="mt-1 text-[#3f6b52]/90">
                Comparte estos datos ahora (no se volverán a mostrar):
                <br />
                <code>{created.email}</code> · contraseña{" "}
                <code>{created.password}</code>
              </p>
            </div>
          )}
          <Button
            disabled={
              saving || !name.trim() || !email.trim() || tempPassword.length < 8
            }
            onClick={() => void create()}
          >
            <UserPlus className="h-4 w-4" />
            {saving ? "Creando…" : "Crear cuenta"}
          </Button>
        </CardContent>
      </Card>

      {/* 2. Lista de Miembros con Departamentos Asignados y Cambio Rápido */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Miembros del Equipo ({members.length})
          </p>
          <span className="text-[11px] text-muted-foreground">
            Puedes cambiar de departamento a cada miembro directamente desde su fila.
          </span>
        </div>

        <div className="space-y-2">
          {members.map((m) => {
            const isOwner = m.role === "owner";
            const memberDeps = getMemberDepartments(m.email);

            return (
              <div
                key={m.id}
                className="flex flex-col gap-3 rounded-lg border bg-card p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ContactAvatar name={m.name} seed={m.id} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{m.name}</p>
                      <Badge variant={isOwner ? "default" : "secondary"} className="text-[10px] h-4.5 px-1.5">
                        {isOwner ? "Propietario" : "Miembro"}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>

                    {/* Etiquetas de departamentos a los que pertenece */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {memberDeps.length > 0 ? (
                        memberDeps.map((d) => {
                          const isTitular =
                            assignments[d.id]?.email?.toLowerCase() === m.email.toLowerCase();
                          return (
                            <span
                              key={d.id}
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{
                                backgroundColor: `${d.badgeColor}18`,
                                color: d.badgeColor,
                                border: `1px solid ${d.badgeColor}40`,
                              }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: d.badgeColor }}
                              />
                              {d.shortName}
                              {isTitular && (
                                <span className="opacity-80 font-bold text-[8.5px]">
                                  (Titular)
                                </span>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[10.5px] italic text-muted-foreground">
                          Sin departamento asignado
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones de miembro: Cambiar de departamento y Eliminar */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Selector rápido: Cambiar a otro departamento */}
                  <select
                    value=""
                    onChange={(e) =>
                      handleReassignMemberFromMemberList(m.email, e.target.value)
                    }
                    aria-label={`Cambiar departamento de ${m.name}`}
                    className="h-8 rounded-md border bg-background px-2.5 text-xs text-muted-foreground shadow-2xs hover:text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="">Cambiar departamento…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        Mover a: {d.name}
                      </option>
                    ))}
                    <option value="none">Quitar de todos los departamentos</option>
                  </select>

                  {!isOwner && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Eliminar a ${m.name}`}
                      disabled={deletingId === m.id}
                      onClick={() => void deleteMember(m)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Asignación de Responsables y Equipo por Departamento */}
      {departments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand" />
                  Responsables y Equipo por Departamento
                </CardTitle>
                <CardDescription className="mt-1">
                  Define el titular y los miembros de apoyo de cada departamento.
                  Puedes eliminar a miembros de un departamento o moverlos de un área a otra en 1 clic.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {departments.map((dep) => {
                const current = assignments[dep.id] ?? {
                  name: dep.assignedName,
                  email: dep.assignedEmail,
                  memberEmails: dep.memberEmails ?? [dep.assignedEmail],
                };

                const currentEmails = current.memberEmails ?? [];
                // Miembros que forman parte de este departamento
                const assignedMembers = members.filter((m) => {
                  const lower = m.email.toLowerCase();
                  return (
                    lower === current.email.toLowerCase() ||
                    currentEmails.some((e) => e.toLowerCase() === lower)
                  );
                });

                // Miembros disponibles que AÚN NO forman parte de este departamento
                const availableMembers = members.filter((m) => {
                  const lower = m.email.toLowerCase();
                  return (
                    lower !== current.email.toLowerCase() &&
                    !currentEmails.some((e) => e.toLowerCase() === lower)
                  );
                });

                return (
                  <div
                    key={dep.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 transition-all"
                    style={{
                      borderColor: `${dep.badgeColor}35`,
                      backgroundColor: `${dep.badgeColor}08`,
                    }}
                  >
                    {/* Cabecera del departamento y Selector de Titular */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: dep.badgeColor }}
                          />
                          <p className="text-sm font-semibold">{dep.name}</p>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold"
                            style={{
                              backgroundColor: `${dep.badgeColor}22`,
                              color: dep.badgeColor,
                            }}
                          >
                            {dep.shortName}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {dep.description}
                        </p>
                      </div>

                      <div className="shrink-0 sm:w-64">
                        <label
                          htmlFor={`titular-${dep.id}`}
                          className="block text-[11px] font-semibold text-muted-foreground mb-1"
                        >
                          Responsable titular (contacto principal IA):
                        </label>
                        <select
                          id={`titular-${dep.id}`}
                          aria-label={`Responsable titular de ${dep.name}`}
                          value={current.email}
                          onChange={(e) =>
                            handleTitularChange(dep.id, e.target.value)
                          }
                          className="h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          {members.map((m) => (
                            <option key={m.id} value={m.email}>
                              {m.name} ({m.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Lista de Miembros Asignados con botones de Eliminar y Mover */}
                    <div className="border-t border-border/40 pt-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11.5px] font-semibold text-foreground">
                          Miembros activos en {dep.shortName} ({assignedMembers.length}):
                        </p>

                        {/* Selector para Agregar miembros que faltan */}
                        {availableMembers.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddMemberToDepartment(dep.id, e.target.value);
                                }
                              }}
                              aria-label={`Agregar miembro a ${dep.name}`}
                              className="h-7 rounded border border-dashed bg-background px-2 text-[11.5px] text-muted-foreground hover:text-foreground focus:border-brand focus:outline-none"
                            >
                              <option value="">+ Agregar miembro a {dep.shortName}…</option>
                              {availableMembers.map((m) => (
                                <option key={m.id} value={m.email}>
                                  + {m.name} ({m.email})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-[10.5px] text-muted-foreground">
                            Todos los miembros están asignados
                          </span>
                        )}
                      </div>

                      {/* Chips/Tarjetas de miembros asignados */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {assignedMembers.map((m) => {
                          const isTitular =
                            m.email.toLowerCase() === current.email.toLowerCase();

                          return (
                            <div
                              key={m.id}
                              className={cn(
                                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs bg-card shadow-2xs transition-all",
                                isTitular ? "border-brand/40 bg-brand/5" : "border-border/70"
                              )}
                            >
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: dep.badgeColor }}
                              />
                              <div className="min-w-0">
                                <span className="font-medium text-foreground">{m.name}</span>
                              </div>

                              {isTitular ? (
                                <span
                                  className="rounded px-1.5 py-0.2 text-[9.5px] font-bold"
                                  style={{
                                    backgroundColor: `${dep.badgeColor}25`,
                                    color: dep.badgeColor,
                                  }}
                                >
                                  Titular
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {/* Dropdown para Mover a otro departamento */}
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleMoveMemberBetweenDepartments(
                                          m.email,
                                          dep.id,
                                          e.target.value
                                        );
                                      }
                                    }}
                                    title="Mover a otro departamento"
                                    aria-label={`Mover ${m.name} a otro departamento`}
                                    className="h-6 rounded border bg-background px-1.5 text-[10.5px] text-muted-foreground hover:text-foreground focus:border-brand focus:outline-none"
                                  >
                                    <option value="">Mover a…</option>
                                    {departments
                                      .filter((other) => other.id !== dep.id)
                                      .map((other) => (
                                        <option key={other.id} value={other.id}>
                                          {other.shortName}
                                        </option>
                                      ))}
                                  </select>

                                  {/* Botón para Eliminar del departamento */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveMemberFromDepartment(dep.id, m.email)
                                    }
                                    title={`Quitar a ${m.name} de ${dep.shortName}`}
                                    aria-label={`Quitar a ${m.name} de ${dep.shortName}`}
                                    className="flex h-6 items-center gap-1 rounded border border-transparent px-1.5 text-[10.5px] text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                    <span>Quitar</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-[10.5px] text-muted-foreground pt-0.5">
                        • Los miembros de apoyo pueden ser eliminados o cambiados a otra área en cualquier momento.
                        <br />
                        • Para cambiar al titular, selecciona otro miembro en el desplegable superior.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                disabled={savingAssignments}
                onClick={() => void persistAssignments(assignments, "Todas las asignaciones fueron guardadas correctamente")}
              >
                {savingAssignments ? "Guardando…" : "Guardar responsables"}
              </Button>

              {savedAssignments && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4" /> Asignaciones actualizadas correctamente
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
