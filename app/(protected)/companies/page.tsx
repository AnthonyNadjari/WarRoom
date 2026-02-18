import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getCompanies } from "@/app/actions/companies";
import { CompaniesClient } from "./companies-client";

export default async function CompaniesPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const companies = await getCompanies();

  return <CompaniesClient initialCompanies={companies} />;
}
