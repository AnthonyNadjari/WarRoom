import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { DashboardClient } from "./dashboard-client";
import { getInteractionsForDashboard } from "@/app/actions/interactions";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const interactions = await getInteractionsForDashboard();

  return <DashboardClient initialInteractions={interactions} />;
}
