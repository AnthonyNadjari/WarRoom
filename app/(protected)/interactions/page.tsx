import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InteractionsClient } from "./interactions-client";

export default async function InteractionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: interactions } = await supabase
    .from("interactions")
    .select("*, company:companies(id, name), contact:contacts(id, first_name, last_name)")
    .order("date_sent", { ascending: false });

  const { data: companies } = await supabase.from("companies").select("id, name").order("name");

  return (
    <InteractionsClient
      initialInteractions={interactions ?? []}
      companies={companies ?? []}
    />
  );
}
