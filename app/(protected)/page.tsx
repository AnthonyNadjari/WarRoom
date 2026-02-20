import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getInteractionsWithRelations } from "@/app/actions/interactions";
import { getCompaniesForSelect } from "@/app/actions/interactions";
import { getProcessesForSelect } from "@/app/actions/processes";
import { InteractionsClient } from "./interactions/interactions-client";

export default async function HomePage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  try {
    const [interactions, companies, processes] = await Promise.all([
      getInteractionsWithRelations(),
      getCompaniesForSelect(),
      getProcessesForSelect(),
    ]);
    return (
      <InteractionsClient
        initialInteractions={interactions}
        companies={companies}
        processes={processes}
      />
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV === "development") {
      throw new Error(`Failed to load interactions: ${message}. Did you run \`npx prisma migrate deploy\`?`);
    }
    throw err;
  }
}
