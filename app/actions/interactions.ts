"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import {
  interactionStatusToApi,
  interactionStatusFromApi,
  interactionTypeToApi,
  interactionTypeFromApi,
  sourceTypeToApi,
  sourceTypeFromApi,
} from "@/lib/map-prisma";
import type {
  InteractionGlobalCategory,
  Priority,
  Outcome,
  Interaction as PrismaInteraction,
} from "@prisma/client";
import type {
  InteractionWithRelations,
  InteractionType,
  InteractionStatus,
  InteractionSourceType,
} from "@/types/database";

type InteractionWithIncludes = PrismaInteraction & {
  company?: { id: string; name: string; websiteDomain: string | null; logoUrl: string | null } | null;
  contact?: { id: string; firstName: string | null; lastName: string | null } | null;
  recruiter?: { id: string; name: string } | null;
  process?: { id: string; roleTitle: string; status: import("@prisma/client").ProcessStatus } | null;
};

function mapInteraction(i: InteractionWithIncludes) {
  return {
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
    recruiter: i.recruiter
      ? { id: i.recruiter.id, name: i.recruiter.name }
      : null,
    process: i.process
      ? { id: i.process.id, role_title: i.process.roleTitle, status: i.process.status }
      : null,
  };
}

const INTERACTION_INCLUDES = {
  company: { select: { id: true, name: true, websiteDomain: true, logoUrl: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  recruiter: { select: { id: true, name: true } },
  process: { select: { id: true, roleTitle: true, status: true } },
} as const;

export async function getInteractionsWithRelations(): Promise<InteractionWithRelations[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const list = await prisma.interaction.findMany({
    where: { userId },
    include: INTERACTION_INCLUDES,
    orderBy: { dateSent: "desc" },
  });
  return list.map((i) => mapInteraction(i as InteractionWithIncludes)) as InteractionWithRelations[];
}

export async function getInteractionsForDashboard(): Promise<InteractionWithRelations[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const list = await prisma.interaction.findMany({
    where: { userId },
    include: INTERACTION_INCLUDES,
    orderBy: { dateSent: "desc" },
  });
  return list.map((i) => mapInteraction(i as InteractionWithIncludes)) as InteractionWithRelations[];
}

export async function getCompaniesForSelect() {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return prisma.company.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getRecruitersForSelect() {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return prisma.company.findMany({
    where: { userId, type: "Recruiter" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getRecruiterStats(recruiterId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const interactions = await prisma.interaction.findMany({
    where: { userId, recruiterId },
    select: { status: true, outcome: true },
  });

  const total = interactions.length;
  let interviews = 0;
  let offers = 0;
  let rejections = 0;
  let active = 0;

  for (const i of interactions) {
    if (i.status === "Interview" || i.outcome === "Interview") interviews++;
    if (i.status === "Offer" || i.outcome === "Offer") offers++;
    if (i.status === "Rejected" || i.outcome === "Rejected") rejections++;
    if (
      i.status !== "Rejected" &&
      i.status !== "Closed" &&
      i.outcome !== "Rejected"
    )
      active++;
  }

  return {
    total,
    interviews,
    offers,
    rejections,
    active,
    conversionRate: total > 0 ? Math.round((interviews / total) * 100) : 0,
  };
}

export async function updateInteraction(
  id: string,
  data: {
    role_title?: string | null;
    global_category?: InteractionGlobalCategory | null;
    type?: InteractionType | null;
    status?: InteractionStatus | string;
    priority?: Priority | null;
    date_sent?: Date | string | null;
    last_update?: Date | string | null;
    next_follow_up_date?: Date | string | null;
    outcome?: Outcome | null;
    comment?: string | null;
    source_type?: InteractionSourceType | string;
    recruiter_id?: string | null;
    process_id?: string | null;
  }
) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  // Validate recruiter if provided
  if (data.source_type != null) {
    const prismaSourceType = sourceTypeFromApi(String(data.source_type));
    if (prismaSourceType === "ViaRecruiter" && !data.recruiter_id) {
      throw new Error("Recruiter is required when source is Via Recruiter");
    }
  }

  if (data.recruiter_id) {
    const recruiter = await prisma.company.findFirst({
      where: { id: data.recruiter_id, userId },
      select: { type: true },
    });
    if (!recruiter || recruiter.type !== "Recruiter") {
      throw new Error("Invalid recruiter: must be a company with type Recruiter");
    }
  }

  const status =
    data.status != null ? interactionStatusFromApi(String(data.status)) : undefined;
  const type =
    data.type != null ? interactionTypeFromApi(String(data.type)) : undefined;
  const sourceType =
    data.source_type != null ? sourceTypeFromApi(String(data.source_type)) : undefined;

  await prisma.interaction.updateMany({
    where: { id, userId },
    data: {
      roleTitle: data.role_title,
      globalCategory: data.global_category,
      type,
      status,
      priority: data.priority,
      dateSent: data.date_sent ? new Date(data.date_sent) : undefined,
      lastUpdate: data.last_update ? new Date(data.last_update) : undefined,
      nextFollowUpDate: data.next_follow_up_date
        ? new Date(data.next_follow_up_date)
        : undefined,
      outcome: data.outcome,
      comment: data.comment,
      sourceType,
      recruiterId: data.recruiter_id,
      processId: data.process_id,
    },
  });
  revalidatePath("/interactions");
  revalidatePath("/");
  if (data.process_id) revalidatePath(`/processes/${data.process_id}`);
}

export async function createInteraction(data: {
  company_id: string;
  contact_id: string;
  role_title?: string | null;
  global_category?: InteractionGlobalCategory | null;
  type?: InteractionType | null;
  status?: InteractionStatus | string;
  priority?: Priority | null;
  date_sent?: Date | string | null;
  comment?: string | null;
  source_type?: InteractionSourceType | string;
  recruiter_id?: string | null;
  process_id?: string | null;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  // Validate recruiter
  const prismaSourceType = data.source_type
    ? sourceTypeFromApi(String(data.source_type))
    : "Direct";

  if (prismaSourceType === "ViaRecruiter" && !data.recruiter_id) {
    throw new Error("Recruiter is required when source is Via Recruiter");
  }

  if (data.recruiter_id) {
    const recruiter = await prisma.company.findFirst({
      where: { id: data.recruiter_id, userId },
      select: { type: true },
    });
    if (!recruiter || recruiter.type !== "Recruiter") {
      throw new Error("Invalid recruiter: must be a company with type Recruiter");
    }
  }

  const status = data.status
    ? interactionStatusFromApi(String(data.status))
    : undefined;
  const type = data.type
    ? interactionTypeFromApi(String(data.type))
    : undefined;

  const interaction = await prisma.interaction.create({
    data: {
      userId,
      companyId: data.company_id,
      contactId: data.contact_id,
      roleTitle: data.role_title ?? null,
      globalCategory: data.global_category ?? null,
      type: type ?? null,
      status: status ?? "Sent",
      priority: data.priority ?? null,
      dateSent: data.date_sent ? new Date(data.date_sent) : null,
      comment: data.comment ?? null,
      sourceType: prismaSourceType,
      recruiterId: data.recruiter_id ?? null,
      processId: data.process_id ?? null,
    },
  });

  revalidatePath("/interactions");
  revalidatePath("/");
  if (data.process_id) revalidatePath(`/processes/${data.process_id}`);

  return interaction.id;
}

export async function getContactsForCompany(companyId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  return prisma.contact.findMany({
    where: { companyId, userId },
    select: { id: true, firstName: true, lastName: true, exactTitle: true },
    orderBy: { lastName: "asc" },
  });
}
