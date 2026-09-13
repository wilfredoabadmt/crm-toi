"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Tag,
  Zap,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
}

interface AssignedDepartment {
  id: string;
  name: string;
  shortName: string;
  description: string;
  badgeColor: string;
  assignedName: string;
  assignedEmail: string;
}

function getInitials(name?: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserProfileClient() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [departments, setDepartments] = useState<AssignedDepartment[]>([]);
  const [allCount, setAllCount] = useState(0);

  // Formulario de datos personales
  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Formulario de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("No se pudo cargar la información de perfil");
      const data = await res.json();
      setUser(data.user);
      setName(data.user.name || "");
      setDepartments(data.departments || []);
      setAllCount(data.allDepartmentsCount || 0);
    } catch (err: unknown) {
      setProfileError(
        err instanceof Error ? err.message : "Error al cargar perfil"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setProfileError("El nombre no puede estar vacío");
      return;
    }

    try {
      setSavingProfile(true);
      setProfileError(null);
      setProfileSuccess(false);

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || "Error al actualizar perfil");
      }

      setUser((prev) => (prev ? { ...prev, name: data.user.name } : null));
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3500);
    } catch (err: unknown) {
      setProfileError(
        err instanceof Error ? err.message : "Error al actualizar perfil"
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Debes ingresar tu contraseña actual");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    try {
      setSavingPassword(true);

      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            "Error al cambiar la contraseña"
        );
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : "Contraseña actual incorrecta o error al cambiar"
      );
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Clock className="mr-2 h-5 w-5 animate-spin text-brand-primary" />
        <span>Cargando perfil de usuario...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      {/* Header */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10 text-xl font-bold text-brand-primary border border-brand-primary/20 shadow-xs">
              {getInitials(name || user?.name)}
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {name || user?.name || "Mi Cuenta"}
                </h1>
                <Badge
                  variant={user?.role === "owner" ? "default" : "secondary"}
                  className="font-medium"
                >
                  {user?.role === "owner"
                    ? "★ Propietario"
                    : "Miembro del Equipo"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {user?.email} · Sesión activa y verificada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Conectado
            </span>
          </div>
        </div>
      </div>

      {/* Acceso Rápido a Herramientas Operativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/settings/quick-replies"
          className="group rounded-xl border bg-card p-5 shadow-xs transition-all hover:border-brand-primary/50 hover:shadow-md block"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base group-hover:text-brand-primary transition-colors">
                Respuestas Rápidas
              </h3>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-brand-primary transition-colors">
              Gestionar atajos →
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Crea atajos con <code className="bg-muted px-1 rounded font-mono">/</code> para insertar saludos, respuestas frecuentes, precios y cuentas bancarias en un clic en el chat.
          </p>
        </Link>

        <Link
          href="/settings/tags"
          className="group rounded-xl border bg-card p-5 shadow-xs transition-all hover:border-brand-primary/50 hover:shadow-md block"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                <Tag className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base group-hover:text-brand-primary transition-colors">
                Etiquetas de Contacto (Tags)
              </h3>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-brand-primary transition-colors">
              Gestionar etiquetas →
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Crea y clasifica tus prospectos con etiquetas visuales de colores (ej: VIP, Cotizado, Urgente) para filtrar y trabajar en equipo.
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formulario de Información Personal */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b">
            <User className="h-5 w-5 text-brand-primary" />
            <h2 className="font-bold text-base">Datos Personales</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {profileError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>¡Tu nombre de perfil ha sido actualizado!</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="profile-name" className="text-xs font-semibold">
                Nombre Completo
              </Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre y apellido"
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Este nombre se mostrará en los chats y al equipo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email" className="text-xs font-semibold">
                Correo Electrónico
              </Label>
              <Input
                id="profile-email"
                value={user?.email || ""}
                disabled
                className="text-sm bg-muted/50 cursor-not-allowed opacity-80"
              />
              <p className="text-[11px] text-muted-foreground">
                El correo es el identificador único de acceso a tu cuenta.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={savingProfile || name.trim() === user?.name}
                className="gap-2 bg-brand-primary text-white hover:bg-brand-primary/90 text-xs px-5"
              >
                {savingProfile ? (
                  <>
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Guardar Datos
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Formulario de Seguridad / Cambio de Contraseña */}
        <div className="rounded-xl border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b">
            <KeyRound className="h-5 w-5 text-brand-primary" />
            <h2 className="font-bold text-base">Seguridad y Contraseña</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>¡Tu contraseña se ha cambiado exitosamente!</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="current-pw" className="text-xs font-semibold">
                Contraseña Actual
              </Label>
              <div className="relative">
                <Input
                  id="current-pw"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-pw" className="text-xs font-semibold">
                Nueva Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw" className="text-xs font-semibold">
                Confirmar Nueva Contraseña
              </Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="text-sm"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={
                  savingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  newPassword.length < 8
                }
                className="gap-2 bg-brand-primary text-white hover:bg-brand-primary/90 text-xs px-5"
              >
                {savingPassword ? (
                  <>
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Cambiar Contraseña
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Departamentos Asignados */}
      <div className="rounded-xl border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-primary" />
            <h2 className="font-bold text-base">Departamentos de Atención</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {user?.role === "owner"
              ? "Supervisión global de todas las áreas"
              : `${departments.length} departamento(s) asignado(s)`}
          </span>
        </div>

        {user?.role === "owner" ? (
          <div className="rounded-lg border border-brand-primary/30 bg-brand-primary/5 p-4 text-xs space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-brand-primary" />
              <p className="font-bold text-foreground">Cuenta de Propietario (Supervisión Total)</p>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Como titular de la cuenta tienes permisos completos para visualizar, intervenir y reasignar prospectos en todos los departamentos de la empresa ({allCount} áreas operativas registradas).
            </p>
          </div>
        ) : departments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {departments.map((dept) => {
              const isTitular =
                dept.assignedEmail.toLowerCase() === user?.email?.toLowerCase();
              return (
                <div
                  key={dept.id}
                  className="rounded-xl border p-4 text-xs space-y-2"
                  style={{
                    borderColor: `${dept.badgeColor}40`,
                    backgroundColor: `${dept.badgeColor}08`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: dept.badgeColor }}
                      />
                      <span className="font-bold text-sm text-foreground">
                        {dept.name}
                      </span>
                    </div>
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: `${dept.badgeColor}25`,
                        color: dept.badgeColor,
                      }}
                    >
                      {isTitular ? "★ Responsable Titular" : "Asesor Asignado"}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {dept.description || "Atención directa de prospectos de esta etapa"}
                  </p>
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Responsable: <strong>{dept.assignedName}</strong></span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ Bandeja activa
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-xs italic">
            No tienes departamentos asignados directamente aún. Contacta al propietario para configurar tus áreas de atención.
          </div>
        )}
      </div>
    </div>
  );
}
