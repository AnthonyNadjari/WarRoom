import { redirect, notFound } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  processStatusToApi,
  interactionStatusToApi,
  interactionTypeToApi,
  interactionStageToApi,
  sourceTypeToApi,
} from "@/lib/map-prisma";
import { getProcessesForSelect } from "@/app/actions/processes";
import { getCompaniesForSelect, getContactsForCompany } from "@/app/actions/interactions";
import { getNotesForProcess } from "@/app/actions/process-notes";
import { ProcessDetailClient } from "./process-detail-client";
import type { ProcessStatus, InteractionWithRelations } from "@/types/database";

export default async function ProcessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const process = await prisma.process.findFirst({
    where: { id, userId },
    include: {
      company: {
        select: { id: true, name: true, websiteDomain: true, logoUrl: true },
      },
      sourceProcess: {
        select: {
          id: true,
          roleTitle: true,
          company: { select: { id: true, name: true } },
        },
      },
      childProcesses: {
        select: {
          id: true,
          roleTitle: true,
          status: true,
          company: { select: { id: true, name: true } },
        },
      },
      interactions: {
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true, websiteDomain: true, logoUrl: true } },
          recruiter: { select: { id: true, name: true } },
        },
        orderBy: { dateSent: "asc" },
      },
      _count: { select: { interactions: true } },
    },
  });

  if (!process) notFound();

  const processApi = {
    id: process.id,
    user_id: process.userId,
    company_id: process.companyId,
    role_title: process.roleTitle,
    location: process.location,
    status: processStatusToApi(process.status) as ProcessStatus,
    source_process_id: process.sourceProcessId,
    created_at: process.createdAt.toISOString(),
    updated_at: process.updatedAt.toISOString(),
    company: process.company
      ? {
          id: process.company.id,
          name: process.company.name,
          website_domain: process.company.websiteDomain,
          logo_url: process.company.logoUrl,
        }
      : null,
    sourceProcess: process.sourceProcess
      ? {
          id: process.sourceProcess.id,
          role_title: process.sourceProcess.roleTitle,
          company: process.sourceProcess.company
            ? { id: process.sourceProcess.company.id, name: process.sourceProcess.company.name }
            : null,
        }
      : null,
    _count: process._count,
  };

  const interactionsApi = process.interactions.map((i) => ({
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
    stage: i.stage != null ? interactionStageToApi(i.stage) : null,
    completed: i.completed ?? false,
    source_type: sourceTypeToApi(i.sourceType),
    recruiter_id: i.recruiterId,
    process_id: i.processId,
    parent_interaction_id: i.parentInteractionId ?? null,
    created_at: i.createdAt.toISOString(),
    updated_at: i.updatedAt.toISOString(),
    company: i.company
      ? {
          id: i.company.id,
          name: i.company.name,
          website_domain: i.company.websiteDomain,
          logo_url: i.company.logoUrl,
        }
      : null,
    contact: i.contact
      ? {
          id: i.contact.id,
          first_name: i.contact.firstName,
          last_name: i.contact.lastName,
        }
      : null,
    recruiter: i.recruiter ? { id: i.recruiter.id, name: i.recruiter.name } : null,
  })) as InteractionWithRelations[];

  const childProcessesApi = process.childProcesses.map((cp) => ({
    id: cp.id,
    role_title: cp.roleTitle,
    status: processStatusToApi(cp.status) as ProcessStatus,
    company: cp.company ? { id: cp.company.id, name: cp.company.name } : null,
  }));

  const [allProcesses, companies, contacts, notes] = await Promise.all([
    getProcessesForSelect(),
    getCompaniesForSelect(),
    getContactsForCompany(process.companyId),
    getNotesForProcess(id),
  ]);

  return (
    <ProcessDetailClient
      process={processApi}
      interactions={interactionsApi}
      childProcesses={childProcessesApi}
      allProcesses={allProcesses.filter((p) => p.id !== id)}
      companies={companies}
      contacts={contacts}
      notes={notes}
    />
  );
}
