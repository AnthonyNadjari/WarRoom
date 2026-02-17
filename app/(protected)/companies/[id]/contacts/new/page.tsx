import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewContactPage(props: { params: Promise<{ id: string }> }) {
  const { id: companyId } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase.from("companies").select("id, name").eq("id", companyId).single();
  if (!company) notFound();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, first_name, last_name")
    .eq("company_id", companyId);

  const managerOptions = (contacts ?? []).map((c) => ({
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "—",
  }));

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={"/companies/" + companyId + "?tab=people"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">New contact · {company.name}</h1>
      </div>
      <ContactForm companyId={companyId} managerOptions={managerOptions} />
    </div>
  );
}
