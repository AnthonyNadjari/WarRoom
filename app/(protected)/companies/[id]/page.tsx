import { redirect, notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { companyTypeToApi, interactionStatusToApi, interactionTypeToApi, sourceTypeToApi, processStatusToApi } from "@/lib/map-prisma";
import { CompanyDetailClient } from "./company-detail-client";
import { getProcessesForCompany } from "@/app/actions/processes";
import type { Contact, Interaction } from "@prisma/client";

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const company = await prisma.company.findFirst({
    where: { id, userId },
  });
  if (!company) notFound();

  const contacts = await prisma.contact.findMany({
    where: { companyId: id, userId },
    orderBy: { createdAt: "desc" },
  });
  const interactions = await prisma.interaction.findMany({
    where: { companyId: id, userId },
    include: {
      contact: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { dateSent: "desc" },
  });

  const companyApi = {
    id: company.id,
    user_id: company.userId,
    name: company.name,
    type: companyTypeToApi(company.type) as import("@/types/database").CompanyType,
    main_location: company.mainLocation,
    website_domain: company.websiteDomain,
    logo_url: company.logoUrl,
    notes: company.notes,
    created_at: company.createdAt.toISOString(),
  };
  const contactsApi = contacts.map((c: Contact) => ({
    id: c.id,
    user_id: c.userId,
    company_id: c.companyId,
    first_name: c.firstName,
    last_name: c.lastName,
    exact_title: c.exactTitle,
    category: c.category,
    seniority: c.seniority,
    location: c.location,
    email: c.email,
    phone: c.phone,
    linkedin_url: c.linkedinUrl,
    manager_id: c.managerId,
    notes: c.notes,
    created_at: c.createdAt.toISOString(),
  }));
  const interactionsApi = interactions.map((i: Interaction & { contact: { id: string; firstName: string | null; lastName: string | null } | null }) => ({
    id: i.id,
    user_id: i.userId,
    company_id: i.companyId,
    contact_id: i.contactId,
    role_title: i.roleTitle,
    global_category: i.globalCategory,
    type: i.type != null ? interactionTypeToApi(i.type) : null,
    status: interactionStatusToApi(i.status),
    priority: i.priority,
    date_sent: i.dateSent?.toISOString().slice(0, 10) ?? null,
    last_update: i.lastUpdate?.toISOString().slice(0, 10) ?? null,
    next_follow_up_date: i.nextFollowUpDate?.toISOString().slice(0, 10) ?? null,
    outcome: i.outcome,
    comment: i.comment,
    source_type: sourceTypeToApi(i.sourceType),
    recruiter_id: i.recruiterId,
    process_id: i.processId,
    created_at: i.createdAt.toISOString(),
    contact: i.contact
      ? {
          id: i.contact.id,
          first_name: i.contact.firstName,
          last_name: i.contact.lastName,
        }
      : null,
  })) as import("@/types/database").InteractionWithRelations[];

  const processes = await getProcessesForCompany(id);

  return (
    <CompanyDetailClient
      company={companyApi}
      contacts={contactsApi}
      interactions={interactionsApi}
      processes={processes}
      defaultTab={tab === "people" ? "people" : tab === "processes" ? "processes" : tab === "performance" ? "performance" : "interactions"}
    />
  );
}
