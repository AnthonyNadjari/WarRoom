import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getInteractionsWithRelations } from "@/app/actions/interactions";
import { getCompaniesForSelect } from "@/app/actions/interactions";
import { InteractionsClient } from "./interactions-client";

export default async function InteractionsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const [interactions, companies] = await Promise.all([
    getInteractionsWithRelations(),
    getCompaniesForSelect(),
  ]);

  return (
    <InteractionsClient
      initialInteractions={interactions}
      companies={companies}
    />
  );
}
