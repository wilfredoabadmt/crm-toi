import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getSessionOrNull } from "@/lib/auth/session";
import { InboxClient } from "@/components/inbox/inbox-client";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await getSessionOrNull();
  const authSession = await getAuth().api.getSession({
    headers: await headers(),
  });

  return (
    <InboxClient
      currentUser={{
        role: session?.role ?? "member",
        email: authSession?.user.email ?? "",
        name: authSession?.user.name ?? "",
      }}
    />
  );
}
