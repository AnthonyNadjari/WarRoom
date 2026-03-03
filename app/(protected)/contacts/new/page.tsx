import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { getCompanies } from "@/app/actions/companies";
import { NewContactClient } from "./new-contact-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewContactPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const companies = await getCompanies();
  if (companies.length === 0) {
    return (
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contacts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            Add contact
          </h1>
        </div>
        <p className="text-muted-foreground">
          Create a company first, then you can add contacts from the company
          page or from here.
        </p>
        <Button asChild className="mt-4">
          <Link href="/companies/new">New company</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">Add contact</h1>
      </div>
      <NewContactClient companies={companies} />
    </div>
  );
}
