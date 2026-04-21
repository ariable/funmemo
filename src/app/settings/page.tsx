import { connection } from "next/server";
import { AuthRequired } from "@/components/auth-required";
import { SettingsPageClient } from "@/components/settings-page-client";
import { getCurrentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await connection();
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <AuthRequired />;
  }

  return <SettingsPageClient userDisplayName={currentUser.displayName} />;
}
