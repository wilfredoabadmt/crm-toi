import { getSessionOrNull } from "@/lib/auth/session";
import { PipelineClient } from "@/components/pipeline/pipeline-client";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const session = await getSessionOrNull();
  return <PipelineClient role={session?.role ?? "member"} />;
}
