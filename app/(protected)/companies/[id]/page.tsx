import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CompanyDetailClient } from "./company-detail-client";

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (!company) notFound();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("company_id", id)
    .order("created_at", { ascending: false });

  const { data: interactions } = await supabase
    .from("interactions")
    .select("*, contact:contacts(id, first_name, last_name)")
    .eq("company_id", id)
    .order("date_sent", { ascending: false });

  return (
    <CompanyDetailClient
      company={company}
      contacts={contacts ?? []}
      interactions={interactions ?? []}
      defaultTab={tab === "people" ? "people" : "interactions"}
    />
  );
}
