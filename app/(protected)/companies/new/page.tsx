import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { CompanyForm } from "@/components/company-form";

export default async function NewCompanyPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">New company</h1>
      <CompanyForm />
    </div>
  );
}
