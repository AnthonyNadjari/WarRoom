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
} from "@/lib/map-prisma";
import type {
  InteractionGlobalCategory,
  Priority,
  Outcome,
} from "@prisma/client";
import type {
  InteractionWithRelations,
  InteractionType,
  InteractionStatus,
} from "@/types/database";

function mapInteraction(i: Awaited<ReturnType<typeof prisma.interaction.findMany>>[number] & { company?: { id: string; name: string } | null; contact?: { id: string; firstName: string | null; lastName: string | null } | null }) {
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
    created_at: i.createdAt.toISOString(),
    company: i.company,
    contact: i.contact
      ? {
          id: i.contact.id,
          first_name: i.contact.firstName,
          last_name: i.contact.lastName,
        }
      : null,
  };
}

export async function getInteractionsWithRelations(): Promise<InteractionWithRelations[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const list = await prisma.interaction.findMany({
    where: { userId },
    include: {
      company: { select: { id: true, name: true } },
      contact: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { dateSent: "desc" },
  });
  return list.map(mapInteraction) as InteractionWithRelations[];
}

export async function getInteractionsForDashboard(): Promise<InteractionWithRelations[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const list = await prisma.interaction.findMany({
    where: { userId },
    include: {
      company: { select: { id: true, name: true } },
      contact: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { dateSent: "desc" },
  });
  return list.map(mapInteraction) as InteractionWithRelations[];
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
  }
) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const status =
    data.status != null ? interactionStatusFromApi(String(data.status)) : undefined;
  const type =
    data.type != null ? interactionTypeFromApi(String(data.type)) : undefined;
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
    },
  });
  revalidatePath("/interactions");
  revalidatePath("/");
}
