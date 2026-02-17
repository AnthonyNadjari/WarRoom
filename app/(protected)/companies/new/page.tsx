import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "@/components/company-form";

export default async function NewCompanyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">New company</h1>
      <CompanyForm />
    </div>
  );
}
