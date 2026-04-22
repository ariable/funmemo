import { connection } from "next/server";
import { AuthRequired } from "@/components/auth-required";
import { parseAuthAttempt } from "@/lib/auth-login";
import { SettingsPageClient } from "@/components/settings-page-client";
import { getCurrentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <AuthRequired authAttempt={parseAuthAttempt(resolvedSearchParams?.authAttempt)} returnTo="/settings" />;
  }

  return <SettingsPageClient userDisplayName={currentUser.displayName} />;
}
