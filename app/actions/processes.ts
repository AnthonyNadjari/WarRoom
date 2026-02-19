"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { processStatusToApi, processStatusFromApi, companyTypeToApi } from "@/lib/map-prisma";
import type { ProcessStatus as PrismaProcessStatus } from "@prisma/client";
import type { ProcessWithRelations, ProcessStatus } from "@/types/database";

type ProcessWithIncludes = {
  id: string;
  userId: string;
  companyId: string;
  roleTitle: string;
  location: string | null;
  status: PrismaProcessStatus;
  sourceProcessId: string | null;
  createdAt: Date;
  updatedAt: Date;
  company?: { id: string; name: string; websiteDomain: string | null; logoUrl: string | null } | null;
  sourceProcess?: {
    id: string;
    roleTitle: string;
    company?: { id: string; name: string } | null;
  } | null;
  _count?: { interactions: number };
};

function mapProcess(p: ProcessWithIncludes): ProcessWithRelations {
  return {
    id: p.id,
    user_id: p.userId,
    company_id: p.companyId,
    role_title: p.roleTitle,
    location: p.location,
    status: processStatusToApi(p.status) as ProcessStatus,
    source_process_id: p.sourceProcessId,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
    company: p.company
      ? {
          id: p.company.id,
          name: p.company.name,
          website_domain: p.company.websiteDomain,
          logo_url: p.company.logoUrl,
        }
      : null,
    sourceProcess: p.sourceProcess
      ? {
          id: p.sourceProcess.id,
          role_title: p.sourceProcess.roleTitle,
          company: p.sourceProcess.company
            ? { id: p.sourceProcess.company.id, name: p.sourceProcess.company.name }
            : null,
        }
      : null,
    _count: p._count,
  };
}

const PROCESS_INCLUDES = {
  company: { select: { id: true, name: true, websiteDomain: true, logoUrl: true } },
  sourceProcess: {
    select: {
      id: true,
      roleTitle: true,
      company: { select: { id: true, name: true } },
    },
  },
  _count: { select: { interactions: true } },
} as const;

export async function getProcesses(): Promise<ProcessWithRelations[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const list = await prisma.process.findMany({
    where: { userId },
    include: PROCESS_INCLUDES,
    orderBy: { updatedAt: "desc" },
  });
  return list.map((p) => mapProcess(p as unknown as ProcessWithIncludes));
}

export async function getProcessById(id: string): Promise<ProcessWithRelations | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const p = await prisma.process.findFirst({
    where: { id, userId },
    include: PROCESS_INCLUDES,
  });
  if (!p) return null;
  return mapProcess(p as unknown as ProcessWithIncludes);
}

export async function getProcessesForCompany(companyId: string): Promise<ProcessWithRelations[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const list = await prisma.process.findMany({
    where: { userId, companyId },
    include: PROCESS_INCLUDES,
    orderBy: { updatedAt: "desc" },
  });
  return list.map((p) => mapProcess(p as unknown as ProcessWithIncludes));
}

export async function getProcessesForDashboard(): Promise<ProcessWithRelations[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const list = await prisma.process.findMany({
    where: { userId },
    include: PROCESS_INCLUDES,
    orderBy: { updatedAt: "desc" },
  });
  return list.map((p) => mapProcess(p as unknown as ProcessWithIncludes));
}

export async function getProcessesForSelect() {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const list = await prisma.process.findMany({
    where: { userId },
    select: {
      id: true,
      roleTitle: true,
      status: true,
      company: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return list.map((p) => ({
    id: p.id,
    role_title: p.roleTitle,
    status: processStatusToApi(p.status),
    company: p.company ? { id: p.company.id, name: p.company.name } : null,
  }));
}

export async function createProcess(data: {
  company_id: string;
  role_title: string;
  location?: string | null;
  status?: ProcessStatus | string;
  source_process_id?: string | null;
}): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  if (!data.company_id || !data.role_title?.trim()) {
    throw new Error("Company and role title are required");
  }

  // Validate company belongs to user
  const company = await prisma.company.findFirst({
    where: { id: data.company_id, userId },
    select: { id: true },
  });
  if (!company) throw new Error("Company not found");

  // Validate source process if provided
  if (data.source_process_id) {
    const sourceProcess = await prisma.process.findFirst({
      where: { id: data.source_process_id, userId },
      select: { id: true },
    });
    if (!sourceProcess) throw new Error("Source process not found");
  }

  const status = data.status ? processStatusFromApi(String(data.status)) : "Active";

  const process = await prisma.process.create({
    data: {
      userId,
      companyId: data.company_id,
      roleTitle: data.role_title.trim(),
      location: data.location ?? null,
      status,
      sourceProcessId: data.source_process_id ?? null,
    },
  });

  revalidatePath("/processes");
  revalidatePath("/");
  revalidatePath(`/companies/${data.company_id}`);

  return process.id;
}

export async function updateProcess(
  id: string,
  data: {
    role_title?: string;
    location?: string | null;
    status?: ProcessStatus | string;
    source_process_id?: string | null;
  }
) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const status = data.status != null ? processStatusFromApi(String(data.status)) : undefined;

  // Validate source process if provided
  if (data.source_process_id) {
    const sourceProcess = await prisma.process.findFirst({
      where: { id: data.source_process_id, userId },
      select: { id: true },
    });
    if (!sourceProcess) throw new Error("Source process not found");
    // Prevent self-reference
    if (data.source_process_id === id) {
      throw new Error("A process cannot be its own source");
    }
  }

  await prisma.process.updateMany({
    where: { id, userId },
    data: {
      roleTitle: data.role_title,
      location: data.location,
      status,
      sourceProcessId: data.source_process_id,
    },
  });

  revalidatePath("/processes");
  revalidatePath(`/processes/${id}`);
  revalidatePath("/");
}

export async function deleteProcess(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  // Unlink child processes before deleting (set their sourceProcessId to null)
  await prisma.process.updateMany({
    where: { sourceProcessId: id, userId },
    data: { sourceProcessId: null },
  });

  await prisma.process.deleteMany({
    where: { id, userId },
  });

  revalidatePath("/processes");
  revalidatePath("/");
}
