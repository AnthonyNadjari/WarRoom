"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";

export type SearchHit = {
  type: "company" | "contact" | "interaction" | "process";
  id: string;
  href: string;
  title: string;
  subtitle?: string;
};

export async function searchAll(query: string): Promise<SearchHit[]> {
  const userId = await getCurrentUserId();
  if (!userId || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const hits: SearchHit[] = [];

  const [companies, contacts, interactions, processes] = await Promise.all([
    prisma.company.findMany({
      where: { userId, name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true },
      take: 5,
    }),
    prisma.contact.findMany({
      where: {
        userId,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { exactTitle: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        exactTitle: true,
        email: true,
        companyId: true,
      },
      take: 10,
    }),
    prisma.interaction.findMany({
      where: {
        userId,
        roleTitle: { contains: q, mode: "insensitive" },
      },
      select: { id: true, roleTitle: true },
      take: 5,
    }),
    prisma.process.findMany({
      where: {
        userId,
        OR: [
          { roleTitle: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
          { company: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        roleTitle: true,
        company: { select: { name: true } },
      },
      take: 5,
    }),
  ]);

  companies.forEach((c) => {
    hits.push({
      type: "company",
      id: c.id,
      href: `/companies/${c.id}`,
      title: c.name,
      subtitle: "Company",
    });
  });
  contacts.forEach((c) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || "Contact";
    hits.push({
      type: "contact",
      id: c.id,
      href: `/companies/${c.companyId}?tab=people`,
      title: name,
      subtitle: c.exactTitle || c.email || undefined,
    });
  });
  interactions.forEach((i) => {
    hits.push({
      type: "interaction",
      id: i.id,
      href: `/interactions?highlight=${i.id}`,
      title: i.roleTitle || "Interaction",
      subtitle: "Interaction",
    });
  });
  processes.forEach((p) => {
    hits.push({
      type: "process",
      id: p.id,
      href: `/processes/${p.id}`,
      title: p.roleTitle,
      subtitle: p.company?.name ? `Process — ${p.company.name}` : "Process",
    });
  });

  return hits;
}
