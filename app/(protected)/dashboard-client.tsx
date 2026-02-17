"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { getFollowUpSeverity } from "@/lib/follow-up";
import type { InteractionWithRelations } from "@/types/database";
import { cn } from "@/lib/utils";

type Section = "red" | "orange" | "interview" | "recent";

function useDashboardInteractions() {
  const [data, setData] = useState<{
    red: InteractionWithRelations[];
    orange: InteractionWithRelations[];
    interview: InteractionWithRelations[];
    recent: InteractionWithRelations[];
  }>({ red: [], orange: [], interview: [], recent: [] });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: rows, error } = await supabase
        .from("interactions")
        .select(
          "*, company:companies(id, name), contact:contacts(id, first_name, last_name)"
        )
        .order("date_sent", { ascending: false });

      if (error) {
        setLoading(false);
        return;
      }

      const red: InteractionWithRelations[] = [];
      const orange: InteractionWithRelations[] = [];
      const interview: InteractionWithRelations[] = [];
      const recent: InteractionWithRelations[] = [];

      const seen = new Set<string>();

      for (const i of rows || []) {
        const severity = getFollowUpSeverity(i);
        if (severity === "red") red.push(i as InteractionWithRelations);
        else if (severity === "orange") orange.push(i as InteractionWithRelations);
        else if (i.status === "Interview") interview.push(i as InteractionWithRelations);
      }

      for (const i of rows || []) {
        if (recent.length >= 10) break;
        recent.push(i as InteractionWithRelations);
      }

      setData({ red, orange, interview, recent });
      setLoading(false);
    }
    load();
  }, [supabase]);

  return { data, loading };
}

function InteractionRow({
  i,
  severity,
}: {
  i: InteractionWithRelations;
  severity?: "red" | "orange";
}) {
  const company = i.company as { name?: string } | null;
  const contact = i.contact as { first_name?: string; last_name?: string } | null;
  const name = contact
    ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
    : "—";

  return (
    <Link
      href={`/interactions?highlight=${i.id}`}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/50",
        severity === "red" && "border-destructive/50 bg-destructive/5",
        severity === "orange" && "border-amber-500/50 bg-amber-500/5"
      )}
    >
      <div className="min-w-0 flex-1">
        <span className="font-medium">{company?.name ?? "—"}</span>
        <span className="text-muted-foreground"> · {name}</span>
      </div>
      <div className="shrink-0 text-muted-foreground">
        {i.date_sent ? new Date(i.date_sent).toLocaleDateString() : "—"}
      </div>
    </Link>
  );
}

function SectionBlock({
  title,
  items,
  severity,
  emptyMessage,
}: {
  title: string;
  items: InteractionWithRelations[];
  severity?: "red" | "orange";
  emptyMessage: string;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((i) => (
            <li key={i.id}>
              <InteractionRow i={i} severity={severity} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardClient() {
  const { data, loading } = useDashboardInteractions();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <div className="grid gap-8 md:grid-cols-2">
          <SectionBlock
            title="Red follow-ups (≥28 days or overdue)"
            items={data.red}
            severity="red"
            emptyMessage="None"
          />
          <SectionBlock
            title="Orange follow-ups (14–27 days)"
            items={data.orange}
            severity="orange"
            emptyMessage="None"
          />
          <SectionBlock
            title="Active interviews"
            items={data.interview}
            emptyMessage="None"
          />
          <SectionBlock
            title="Recently sent"
            items={data.recent}
            emptyMessage="No interactions yet"
          />
        </div>
      </div>
    </div>
  );
}
