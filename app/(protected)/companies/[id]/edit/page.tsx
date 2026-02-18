import { redirect, notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getCompanyById } from "@/app/actions/companies";
import { CompanyForm } from "@/components/company-form";

export default async function EditCompanyPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const company = await getCompanyById(id);
  if (!company) notFound();

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">
        Edit company
      </h1>
      <CompanyForm company={company} />
    </div>
  );
}
