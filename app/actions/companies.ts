"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import type { CompanyType as PrismaCompanyType } from "@prisma/client";
import type { CompanyType } from "@/types/database";
import { companyTypeToPrisma, companyTypeToApi } from "@/lib/map-prisma";

export async function getCompanies() {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const list = await prisma.company.findMany({
    where: { userId },
    select: { id: true, name: true, type: true, mainLocation: true, websiteDomain: true, logoUrl: true },
    orderBy: { name: "asc" },
  });
  return list.map((c: { id: string; name: string; type: PrismaCompanyType; mainLocation: string | null; websiteDomain: string | null; logoUrl: string | null }) => ({
    id: c.id,
    name: c.name,
    type: companyTypeToApi(c.type) as CompanyType,
    main_location: c.mainLocation,
    website_domain: c.websiteDomain,
    logo_url: c.logoUrl,
  }));
}

export async function getCompanyById(id: string): Promise<{
  id: string;
  user_id: string;
  name: string;
  type: CompanyType;
  main_location: string | null;
  website_domain: string | null;
  logo_url: string | null;
  notes: string | null;
  created_at: string;
} | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const c = await prisma.company.findFirst({
    where: { id, userId },
  });
  if (!c) return null;
  return {
    id: c.id,
    user_id: c.userId,
    name: c.name,
    type: companyTypeToApi(c.type) as CompanyType,
    main_location: c.mainLocation,
    website_domain: c.websiteDomain,
    logo_url: c.logoUrl,
    notes: c.notes,
    created_at: c.createdAt.toISOString(),
  };
}

export async function createCompany(data: {
  name: string;
  type: CompanyType | string;
  main_location: string | null;
  website_domain: string | null;
  logo_url: string | null;
  notes: string | null;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const company = await prisma.company.create({
    data: {
      userId,
      name: data.name,
      type: companyTypeToPrisma(data.type) as PrismaCompanyType,
      mainLocation: data.main_location ?? null,
      websiteDomain: data.website_domain?.trim() || null,
      logoUrl: data.logo_url?.trim() || null,
      notes: data.notes ?? null,
    },
    select: { id: true },
  });
  revalidatePath("/companies");
  revalidatePath("/");
  return company;
}

export async function updateCompany(
  id: string,
  data: {
    name: string;
    type: CompanyType | string;
    main_location: string | null;
    website_domain: string | null;
    logo_url: string | null;
    notes: string | null;
  }
) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  await prisma.company.updateMany({
    where: { id, userId },
    data: {
      name: data.name,
      type: companyTypeToPrisma(data.type),
      mainLocation: data.main_location ?? null,
      websiteDomain: data.website_domain?.trim() || null,
      logoUrl: data.logo_url?.trim() || null,
      notes: data.notes ?? null,
    },
  });
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  revalidatePath("/");
}

export async function deleteCompany(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  await prisma.company.deleteMany({ where: { id, userId } });
  revalidatePath("/companies");
}
