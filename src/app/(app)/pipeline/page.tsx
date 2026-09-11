import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getSessionOrNull } from "@/lib/auth/session";
import { PipelineClient } from "@/components/pipeline/pipeline-client";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await getSessionOrNull();
  const authSession = await getAuth().api.getSession({
    headers: await headers(),
  });

  return (
    <PipelineClient
      role={session?.role ?? "member"}
      userEmail={authSession?.user.email ?? ""}
    />
  );
}
