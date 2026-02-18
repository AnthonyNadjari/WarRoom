"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import type { Interaction } from "@prisma/client";

type ExportRow = Interaction & {
  company: { name: string } | null;
  contact: { firstName: string | null; lastName: string | null; email: string | null } | null;
};

export async function getInteractionsForExport(): Promise<ExportRow[] | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return prisma.interaction.findMany({
    where: { userId },
    include: {
      company: { select: { name: true } },
      contact: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { dateSent: "desc" },
  }) as Promise<ExportRow[]>;
}
