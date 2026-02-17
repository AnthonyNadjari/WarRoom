import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CompanyForm } from "@/components/company-form";

export default async function EditCompanyPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase.from("companies").select("*").eq("id", id).single();
  if (!company) notFound();

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Edit company</h1>
      <CompanyForm company={company} />
    </div>
  );
}
