"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Trash2, UserPlus, Users } from "lucide-react";
import { ContactAvatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    Record<string, { name: string; email: string }>
  >({});
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [savedAssignments, setSavedAssignments] = useState(false);

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
      const initial: Record<string, { name: string; email: string }> = {};
      for (const d of data.departments) {
        initial[d.id] = { name: d.assignedName, email: d.assignedEmail };
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
      `¿Estás seguro de que deseas eliminar a "${member.name}" (${member.email}) del equipo?\n\nPerderá acceso de inmediato al CRM.`
    );
    if (!ok) return;

    setDeletingId(member.id);
    const res = await fetch(`/api/settings/team?id=${member.id}`, {
      method: "DELETE",
    }).catch(() => null);
    setDeletingId(null);

    if (res?.ok) {
      void refetch();
    } else {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      alert(data?.error?.message ?? "No se pudo eliminar al miembro");
    }
  }

  function handleAssignmentChange(depId: string, memberEmail: string) {
    const member = members.find((m) => m.email === memberEmail);
    if (!member) return;
    setAssignments((prev) => ({
      ...prev,
      [depId]: { name: member.name, email: member.email },
    }));
    setSavedAssignments(false);
  }

  async function saveAssignments() {
    setSavingAssignments(true);
    const res = await fetch("/api/settings/departments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignments }),
    }).catch(() => null);
    setSavingAssignments(false);

    if (res?.ok) {
      setSavedAssignments(true);
      void refetch();
      setTimeout(() => setSavedAssignments(false), 3000);
    } else {
      alert("No se pudieron guardar las asignaciones");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
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

      {/* 2. Lista de Miembros con opción de Eliminar */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Miembros ({members.length})
        </p>
        {members.map((m) => {
          const isOwner = m.role === "owner";
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <ContactAvatar name={m.name} seed={m.id} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Badge variant={isOwner ? "default" : "secondary"}>
                {isOwner ? "Propietario" : "Miembro"}
              </Badge>

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
          );
        })}
      </div>

      {/* 3. Asignación de Responsables por Departamento */}
      {departments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand" />
                  Responsables por Departamento
                </CardTitle>
                <CardDescription className="mt-1">
                  Define quién atiende cada sección. La IA derivará las consultas y
                  la bandeja se organizará según estos responsables.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {departments.map((dep) => {
                const current = assignments[dep.id] ?? {
                  name: dep.assignedName,
                  email: dep.assignedEmail,
                };

                return (
                  <div
                    key={dep.id}
                    className="flex flex-col gap-2 rounded-lg border p-3.5 sm:flex-row sm:items-center sm:justify-between"
                    style={{
                      borderColor: `${dep.badgeColor}35`,
                      backgroundColor: `${dep.badgeColor}08`,
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: dep.badgeColor }}
                        />
                        <p className="text-sm font-semibold">{dep.name}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {dep.description}
                      </p>
                    </div>

                    <div className="shrink-0 sm:w-64">
                      <select
                        aria-label={`Responsable de ${dep.name}`}
                        value={current.email}
                        onChange={(e) =>
                          handleAssignmentChange(dep.id, e.target.value)
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
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                disabled={savingAssignments}
                onClick={() => void saveAssignments()}
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

