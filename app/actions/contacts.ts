"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import type { ContactCategory, Seniority, Contact } from "@prisma/client";

export async function getContactsWithCompany() {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const list = await prisma.contact.findMany({
    where: { userId },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return list.map((c: Contact & { company: { id: string; name: string } }) => ({
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
    company: c.company,
  }));
}

export async function createContact(data: {
  company_id: string;
  first_name: string | null;
  last_name: string | null;
  exact_title: string | null;
  category: ContactCategory | null;
  seniority: Seniority | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  manager_id: string | null;
  notes: string | null;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const { company_id, ...rest } = data;
  await prisma.contact.create({
    data: {
      userId,
      companyId: company_id,
      firstName: rest.first_name,
      lastName: rest.last_name,
      exactTitle: rest.exact_title,
      category: rest.category,
      seniority: rest.seniority,
      location: rest.location,
      email: rest.email,
      phone: rest.phone,
      linkedinUrl: rest.linkedin_url,
      managerId: rest.manager_id,
      notes: rest.notes,
    },
  });
  revalidatePath("/contacts");
  revalidatePath(`/companies/${company_id}`);
}

export async function updateContact(
  id: string,
  data: {
    first_name: string | null;
    last_name: string | null;
    exact_title: string | null;
    category: ContactCategory | null;
    seniority: Seniority | null;
    location: string | null;
    email: string | null;
    phone: string | null;
    linkedin_url: string | null;
    manager_id: string | null;
    notes: string | null;
  }
) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  await prisma.contact.updateMany({
    where: { id, userId },
    data: {
      firstName: data.first_name,
      lastName: data.last_name,
      exactTitle: data.exact_title,
      category: data.category,
      seniority: data.seniority,
      location: data.location,
      email: data.email,
      phone: data.phone,
      linkedinUrl: data.linkedin_url,
      managerId: data.manager_id,
      notes: data.notes,
    },
  });
  revalidatePath("/contacts");
}
