import { connection } from "next/server";
import { SettingsPageClient } from "@/components/settings-page-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await connection();
  return <SettingsPageClient />;
}
