import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { DashboardClient } from "./dashboard-client";
import { getInteractionsForDashboard } from "@/app/actions/interactions";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  try {
    const interactions = await getInteractionsForDashboard();
    return <DashboardClient initialInteractions={interactions} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV === "development") {
      throw new Error(`Dashboard failed: ${message}. Did you run \`npx prisma migrate deploy\`?`);
    }
    throw err;
  }
}
