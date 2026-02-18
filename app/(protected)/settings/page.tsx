import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Settings</h1>
      <SettingsClient />
    </div>
  );
}
