import type { Interaction } from "@/types/database";

export type FollowUpSeverity = "normal" | "orange" | "red";

/**
 * If status = "Waiting":
 * 0–13 days since date_sent → normal
 * 14–27 days → orange
 * 28+ days → red
 * If next_follow_up_date <= today: override and show red.
 */
export function getFollowUpSeverity(
  interaction: Pick<
    Interaction,
    "status" | "date_sent" | "next_follow_up_date"
  >
): FollowUpSeverity {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (interaction.next_follow_up_date) {
    const nextDate = new Date(interaction.next_follow_up_date);
    nextDate.setHours(0, 0, 0, 0);
    if (nextDate.getTime() <= today.getTime()) return "red";
  }

  if (interaction.status !== "Waiting" || !interaction.date_sent) {
    return "normal";
  }

  const sent = new Date(interaction.date_sent);
  sent.setHours(0, 0, 0, 0);
  const days = Math.floor(
    (today.getTime() - sent.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (days >= 28) return "red";
  if (days >= 14) return "orange";
  return "normal";
}

export function isOverdueFollowUp(interaction: Pick<Interaction, "next_follow_up_date">): boolean {
  if (!interaction.next_follow_up_date) return false;
  const next = new Date(interaction.next_follow_up_date);
  next.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return next.getTime() <= today.getTime();
}
