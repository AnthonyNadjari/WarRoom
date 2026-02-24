"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import type { ProcessNote } from "@/types/database";

export async function getNotesForProcess(processId: string): Promise<ProcessNote[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const notes = await prisma.processNote.findMany({
    where: { processId, userId },
    orderBy: { createdAt: "asc" },
  });

  return notes.map((n) => ({
    id: n.id,
    user_id: n.userId,
    process_id: n.processId,
    content: n.content,
    created_at: n.createdAt.toISOString(),
  }));
}

export async function createProcessNote(data: {
  process_id: string;
  content: string;
}): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  if (!data.content.trim()) {
    throw new Error("Note content cannot be empty");
  }

  // Verify process belongs to user
  const process = await prisma.process.findFirst({
    where: { id: data.process_id, userId },
    select: { id: true },
  });
  if (!process) throw new Error("Process not found");

  const note = await prisma.processNote.create({
    data: {
      userId,
      processId: data.process_id,
      content: data.content.trim(),
    },
  });

  revalidatePath(`/processes/${data.process_id}`);
  return note.id;
}

export async function deleteProcessNote(noteId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const note = await prisma.processNote.findFirst({
    where: { id: noteId, userId },
    select: { processId: true },
  });

  if (!note) throw new Error("Note not found");

  await prisma.processNote.delete({
    where: { id: noteId },
  });

  revalidatePath(`/processes/${note.processId}`);
}
