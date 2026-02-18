import { redirect, notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ContactForm } from "@/components/contact-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewContactPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = await props.params;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    select: { id: true, name: true },
  });
  if (!company) notFound();

  const contacts = await prisma.contact.findMany({
    where: { companyId, userId },
    select: { id: true, firstName: true, lastName: true },
  });
  const managerOptions = contacts.map((c: { id: string; firstName: string | null; lastName: string | null }) => ({
    id: c.id,
    name: [c.firstName, c.lastName].filter(Boolean).join(" ") || "—",
  }));

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={"/companies/" + companyId + "?tab=people"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          New contact · {company.name}
        </h1>
      </div>
      <ContactForm companyId={companyId} managerOptions={managerOptions} />
    </div>
  );
}
