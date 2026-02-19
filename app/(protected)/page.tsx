import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { DashboardClient } from "./dashboard-client";
import { getInteractionsForDashboard } from "@/app/actions/interactions";
import { getProcessesForDashboard } from "@/app/actions/processes";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const [interactions, processes] = await Promise.all([
    getInteractionsForDashboard(),
    getProcessesForDashboard(),
  ]);

  return (
    <DashboardClient
      initialInteractions={interactions}
      initialProcesses={processes}
    />
  );
}
