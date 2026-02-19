import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getInteractionsWithRelations } from "@/app/actions/interactions";
import { getCompaniesForSelect } from "@/app/actions/interactions";
import { getProcessesForSelect } from "@/app/actions/processes";
import { InteractionsClient } from "./interactions-client";

export default async function InteractionsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

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
}
