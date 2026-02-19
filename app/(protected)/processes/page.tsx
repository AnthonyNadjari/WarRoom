import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getProcesses } from "@/app/actions/processes";
import { getCompaniesForSelect } from "@/app/actions/interactions";
import { getProcessesForSelect } from "@/app/actions/processes";
import { ProcessesClient } from "./processes-client";

export default async function ProcessesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; company?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const { new: isNew, company: preselectedCompanyId } = await searchParams;

  const [processes, companies, allProcesses] = await Promise.all([
    getProcesses(),
    getCompaniesForSelect(),
    getProcessesForSelect(),
  ]);

  return (
    <ProcessesClient
      initialProcesses={processes}
      companies={companies}
      allProcesses={allProcesses}
      openNew={isNew === "true"}
      preselectedCompanyId={preselectedCompanyId}
    />
  );
}
