"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRightLeft,
  Building,
  Check,
  CreditCard,
  Plus,
  ShoppingBag,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { ContactAvatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
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

const COLOR_PALETTE = [
  { label: "Celeste TOI", value: "#0ea5e9" },
  { label: "Ámbar", value: "#f59e0b" },
  { label: "Esmeralda", value: "#10b981" },
  { label: "Púrpura", value: "#8b5cf6" },
  { label: "Índigo", value: "#6366f1" },
  { label: "Rosa", value: "#ec4899" },
  { label: "Naranja", value: "#f97316" },
  { label: "Teal", value: "#14b8a6" },
];

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

  // Modal de Crear Departamento / Sucursal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newDepName, setNewDepName] = useState("");
  const [newDepShortName, setNewDepShortName] = useState("");
  const [newDepColor, setNewDepColor] = useState(COLOR_PALETTE[0]!.value);
  const [newDepIcon, setNewDepIcon] = useState<"building" | "wrench" | "shopping-bag" | "credit-card">("building");
  const [newDepDescription, setNewDepDescription] = useState("");
  const [newDepTitularEmail, setNewDepTitularEmail] = useState("");
  const [creatingDep, setCreatingDep] = useState(false);

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
      if (!newDepTitularEmail && data.members[0]) {
        setNewDepTitularEmail(data.members[0].email);
      }
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
  }, [newDepTitularEmail]);

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

  /** Crear un nuevo Departamento o Sucursal */
  async function handleCreateDepartment() {
    if (!newDepName.trim() || !newDepShortName.trim()) {
      alert("Por favor ingresa el nombre y nombre corto de la sucursal o departamento");
      return;
    }

    const titular = members.find(
      (m) => m.email.toLowerCase() === newDepTitularEmail.toLowerCase()
    );
    if (!titular) {
      alert("Por favor selecciona un Responsable Titular válido para la sucursal");
      return;
    }

    setCreatingDep(true);
    const sanitizedId = `suc_${newDepShortName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "_")}_${Date.now().toString(36)}`;

    const newDep: DepartmentConfig = {
      id: sanitizedId,
      name: newDepName.trim(),
      shortName: newDepShortName.trim(),
      badgeColor: newDepColor,
      icon: newDepIcon,
      description: newDepDescription.trim() || `Atención de consultas en ${newDepName.trim()}`,
      assignedName: titular.name,
      assignedEmail: titular.email,
      memberEmails: [titular.email],
      keywords: [newDepShortName.toLowerCase(), newDepName.toLowerCase()],
    };

    // Obtener sucursales/departamentos personalizados actuales
    const currentCustom = departments.filter(
      (d) => !["tecnico", "administrativo", "comercial", "gerencia"].includes(d.id)
    );
    const updatedCustom = [...currentCustom, newDep];

    // Actualizar asignaciones
    const updatedAssignments = {
      ...assignments,
      [sanitizedId]: {
        name: titular.name,
        email: titular.email,
        memberEmails: [titular.email],
      },
    };

    const res = await fetch("/api/settings/departments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        assignments: updatedAssignments,
        customDepartments: updatedCustom,
      }),
    }).catch(() => null);

    setCreatingDep(false);

    if (res?.ok) {
      setCreateModalOpen(false);
      setNewDepName("");
      setNewDepShortName("");
      setNewDepDescription("");
      showFeedback(`Sucursal / Departamento "${newDep.name}" creado con éxito`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("departments-updated"));
      }
      void refetch();
    } else {
      alert("No se pudo crear el departamento o sucursal");
    }
  }

  /** Eliminar un Departamento o Sucursal personalizado */
  async function handleDeleteCustomDepartment(dep: DepartmentConfig) {
    const ok = window.confirm(
      `¿Estás seguro de que deseas eliminar "${dep.name}" (${dep.shortName})?\n\nEsta acción quitará el departamento de la bandeja y del pipeline.`
    );
    if (!ok) return;

    const res = await fetch(`/api/settings/departments?id=${dep.id}`, {
      method: "DELETE",
    }).catch(() => null);

    if (res?.ok) {
      showFeedback(`"${dep.name}" eliminado correctamente`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("departments-updated"));
      }
      void refetch();
    } else {
      alert("No se pudo eliminar el departamento");
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
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

      {/* 1. Crear cuenta de equipo */}
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

      {/* 2. Lista de Miembros con Departamentos Asignados */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Miembros del Equipo ({members.length})
          </p>
          <span className="text-[11px] text-muted-foreground">
            Puedes cambiar de área a cualquier miembro directamente desde su fila.
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
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold"
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
                                <span className="opacity-80 font-bold text-[9px]">
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
                  <select
                    value=""
                    onChange={(e) =>
                      handleReassignMemberFromMemberList(m.email, e.target.value)
                    }
                    aria-label={`Cambiar departamento de ${m.name}`}
                    className="h-8 rounded-md border bg-background px-2.5 text-xs text-muted-foreground shadow-2xs hover:text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="">Cambiar área…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        Mover a: {d.name}
                      </option>
                    ))}
                    <option value="none">Quitar de todas las áreas</option>
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

      {/* 3. Asignación de Responsables, Nómina y Creación de Sucursales */}
      {departments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand" />
                  Responsables y Nómina por Departamento / Sucursal
                </CardTitle>
                <CardDescription className="mt-1">
                  Revisa los nombres de todos los colaboradores asignados a cada área o sucursal.
                </CardDescription>
              </div>

              {/* Botón para Crear Departamento / Sucursal */}
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Crear Departamento o Sucursal</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
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

                const isCustomDep = !["tecnico", "administrativo", "comercial", "gerencia"].includes(dep.id);

                return (
                  <div
                    key={dep.id}
                    className="flex flex-col gap-3.5 rounded-xl border p-4.5 transition-all shadow-2xs"
                    style={{
                      borderColor: `${dep.badgeColor}40`,
                      backgroundColor: `${dep.badgeColor}09`,
                    }}
                  >
                    {/* Cabecera del departamento / sucursal y Selector de Titular */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border/30 pb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: dep.badgeColor }}
                          />
                          <p className="text-base font-bold text-foreground">{dep.name}</p>
                          <span
                            className="rounded px-2 py-0.5 text-[11px] font-bold"
                            style={{
                              backgroundColor: `${dep.badgeColor}25`,
                              color: dep.badgeColor,
                            }}
                          >
                            {dep.shortName}
                          </span>
                          {isCustomDep && (
                            <span className="rounded bg-brand/10 border border-brand/30 px-2 py-0.5 text-[10px] font-semibold text-brand">
                              Sucursal / Personalizada
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dep.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 sm:w-72">
                        <div className="w-full">
                          <label
                            htmlFor={`titular-${dep.id}`}
                            className="block text-[11px] font-semibold text-muted-foreground mb-1"
                          >
                            Responsable titular (contacto principal):
                          </label>
                          <select
                            id={`titular-${dep.id}`}
                            aria-label={`Responsable titular de ${dep.name}`}
                            value={current.email}
                            onChange={(e) =>
                              handleTitularChange(dep.id, e.target.value)
                            }
                            className="h-9 w-full rounded-md border bg-background px-3 py-1 text-xs shadow-2xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-medium"
                          >
                            {members.map((m) => (
                              <option key={m.id} value={m.email}>
                                {m.name} ({m.email})
                              </option>
                            ))}
                          </select>
                        </div>

                        {isCustomDep && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title={`Eliminar ${dep.name}`}
                            onClick={() => void handleDeleteCustomDepartment(dep)}
                            className="h-9 w-9 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive self-end shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Nómina Detallada de Miembros que pertenecen a este Departamento */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Nómina de Integrantes ({assignedMembers.length})
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            — Personal activo asignado a {dep.shortName}
                          </span>
                        </div>

                        {/* Selector para Agregar colaboradores disponibles */}
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
                              className="h-7.5 rounded-md border border-dashed bg-background px-2.5 text-xs text-muted-foreground hover:text-foreground focus:border-brand focus:outline-none shadow-2xs font-medium"
                            >
                              <option value="">+ Sumar miembro a {dep.shortName}…</option>
                              {availableMembers.map((m) => {
                                const currentDepOfM = departments.find((d) => {
                                  const a = assignments[d.id];
                                  return (
                                    a?.email?.toLowerCase() === m.email.toLowerCase() ||
                                    (a?.memberEmails ?? []).some(
                                      (e) => e.toLowerCase() === m.email.toLowerCase()
                                    )
                                  );
                                });

                                return (
                                  <option key={m.id} value={m.email}>
                                    + {m.name}{" "}
                                    {currentDepOfM
                                      ? `(Mover desde ${currentDepOfM.shortName})`
                                      : `(Sin área)`}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-medium">
                            Todos los miembros están asignados
                          </span>
                        )}
                      </div>

                      {/* Tarjetas de Miembros con Nombre Visible, Correo y Rol */}
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {assignedMembers.map((m) => {
                          const isTitular =
                            m.email.toLowerCase() === current.email.toLowerCase();

                          return (
                            <div
                              key={m.id}
                              className={cn(
                                "flex items-center justify-between gap-3 rounded-lg border p-3 bg-card shadow-2xs transition-all",
                                isTitular
                                  ? "border-brand/50 bg-brand/5 shadow-xs"
                                  : "border-border/70 hover:border-border"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-text shadow-2xs">
                                  {initials(m.name)}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="truncate text-xs font-bold text-foreground">
                                      {m.name}
                                    </p>
                                    {isTitular ? (
                                      <span
                                        className="rounded px-1.5 py-0.2 text-[9.5px] font-bold shrink-0"
                                        style={{
                                          backgroundColor: `${dep.badgeColor}25`,
                                          color: dep.badgeColor,
                                        }}
                                      >
                                        ★ Titular
                                      </span>
                                    ) : (
                                      <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] text-muted-foreground shrink-0 font-medium">
                                        Apoyo
                                      </span>
                                    )}
                                  </div>
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {m.email}
                                  </p>
                                </div>
                              </div>

                              {!isTitular && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Mover a otra área */}
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
                                    title="Mover a otra área"
                                    aria-label={`Mover ${m.name} a otra área`}
                                    className="h-7 rounded border bg-background px-2 text-[11px] text-muted-foreground hover:text-foreground focus:border-brand focus:outline-none font-medium"
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

                                  {/* Botón Quitar de esta área */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveMemberFromDepartment(dep.id, m.email)
                                    }
                                    title={`Quitar a ${m.name} de ${dep.shortName}`}
                                    aria-label={`Quitar a ${m.name} de ${dep.shortName}`}
                                    className="flex h-7 items-center gap-1 rounded border border-transparent px-2 text-[11px] font-medium text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    <span>Quitar</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-[10.5px] text-muted-foreground pt-1">
                        • Cada miembro pertenece a un solo departamento o sucursal a la vez para mantener el orden en la atención.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                disabled={savingAssignments}
                onClick={() =>
                  void persistAssignments(
                    assignments,
                    "Todas las asignaciones fueron guardadas correctamente"
                  )
                }
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

      {/* Modal: Crear Departamento o Sucursal */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Building className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Crear Departamento o Sucursal
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Habilita una nueva área u oficina con su propio pipeline, bandeja y derivaciones.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-dep-name" className="text-xs font-semibold">
                    Nombre completo
                  </Label>
                  <Input
                    id="new-dep-name"
                    placeholder="ej. Sucursal Cochabamba"
                    value={newDepName}
                    onChange={(e) => setNewDepName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-dep-short" className="text-xs font-semibold">
                    Nombre corto (pestañas)
                  </Label>
                  <Input
                    id="new-dep-short"
                    placeholder="ej. Suc. Cochabamba"
                    value={newDepShortName}
                    onChange={(e) => setNewDepShortName(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Selector de Color Corporativo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Color de Identificación</Label>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {COLOR_PALETTE.map((c) => {
                    const isSelected = newDepColor === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewDepColor(c.value)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-all",
                          isSelected
                            ? "border-foreground bg-accent font-semibold shadow-xs"
                            : "border-border/60 hover:bg-muted/50"
                        )}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.value }}
                        />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Ícono */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo / Ícono</Label>
                <div className="grid grid-cols-4 gap-2 pt-0.5">
                  {[
                    { id: "building", label: "Sucursal", icon: Building },
                    { id: "wrench", label: "Técnico", icon: Wrench },
                    { id: "shopping-bag", label: "Comercial", icon: ShoppingBag },
                    { id: "credit-card", label: "Cobranzas", icon: CreditCard },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = newDepIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewDepIcon(item.id as never)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border p-2.5 text-xs transition-all",
                          isSelected
                            ? "border-brand bg-brand/10 font-bold text-brand"
                            : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[11px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Descripción para el Agente de IA y los operadores */}
              <div className="space-y-1.5">
                <Label htmlFor="new-dep-desc" className="text-xs font-semibold">
                  Descripción (qué atiende esta área o sucursal)
                </Label>
                <Input
                  id="new-dep-desc"
                  placeholder="ej. Atención presencial, trámites y cobranzas en la sucursal de Cochabamba"
                  value={newDepDescription}
                  onChange={(e) => setNewDepDescription(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Responsable Titular */}
              <div className="space-y-1.5">
                <Label htmlFor="new-dep-titular" className="text-xs font-semibold">
                  Responsable Titular (Líder del área)
                </Label>
                <select
                  id="new-dep-titular"
                  value={newDepTitularEmail}
                  onChange={(e) => setNewDepTitularEmail(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 py-1 text-xs shadow-2xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-medium"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.email}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  El titular liderará la atención y recibirá las transferencias directas del bot de WhatsApp.
                </p>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={creatingDep || !newDepName.trim() || !newDepShortName.trim()}
                onClick={() => void handleCreateDepartment()}
              >
                {creatingDep ? "Creando…" : "Crear Departamento / Sucursal"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
