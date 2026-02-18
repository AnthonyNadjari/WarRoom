import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getContactsWithCompany } from "@/app/actions/contacts";
import { ContactsClient } from "./contacts-client";

export default async function ContactsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const contacts = await getContactsWithCompany();

  return <ContactsClient initialContacts={contacts} />;
}
