"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export async function getInteractionsForExport() {
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
  });
}
