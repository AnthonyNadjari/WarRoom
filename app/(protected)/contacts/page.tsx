import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContactsClient } from "./contacts-client";

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*, company:companies(id, name)")
    .order("created_at", { ascending: false });

  return <ContactsClient initialContacts={contacts ?? []} />;
}
