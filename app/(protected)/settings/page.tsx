import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  return (
    <div className="flex flex-1 flex-col p-5 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and export data
        </p>
      </div>
      <SettingsClient />
    </div>
  );
}
