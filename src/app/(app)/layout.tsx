import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getSessionOrNull } from "@/lib/auth/session";
import { getBranding } from "@/server/branding";
import { getResolvedDepartments } from "@/server/departments";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSessionOrNull();
  if (!session) redirect("/login");
  const [branding, departments] = await Promise.all([
    getBranding(session.organizationId),
    getResolvedDepartments(session.organizationId),
  ]);
  const authSession = await getAuth().api.getSession({
    headers: await headers(),
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppNav
        branding={branding}
        userName={authSession?.user.name ?? "Usuario"}
        userEmail={authSession?.user.email ?? ""}
        role={session.role}
        initialDepartments={departments}
      />
      <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
