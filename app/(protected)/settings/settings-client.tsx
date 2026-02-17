"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function SettingsClient() {
  const [exporting, setExporting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  async function handleExportCSV() {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from("interactions")
        .select(
          `
          id,
          role_title,
          global_category,
          type,
          status,
          priority,
          date_sent,
          last_update,
          next_follow_up_date,
          outcome,
          comment,
          created_at,
          company:companies(name),
          contact:contacts(first_name, last_name, email)
        `
        )
        .order("date_sent", { ascending: false });

      if (error) throw error;

      const headers = [
        "Company",
        "Contact",
        "Email",
        "Role",
        "Category",
        "Type",
        "Status",
        "Priority",
        "Date sent",
        "Last update",
        "Next follow-up",
        "Outcome",
        "Comment",
      ];

      const rows = (data ?? []).map((i: Record<string, unknown>) => {
        const company = i.company as { name?: string } | null;
        const contact = i.contact as {
          first_name?: string;
          last_name?: string;
          email?: string;
        } | null;
        const name = contact
          ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
          : "";
        return [
          company?.name ?? "",
          name,
          contact?.email ?? "",
          (i.role_title as string) ?? "",
          (i.global_category as string) ?? "",
          (i.type as string) ?? "",
          (i.status as string) ?? "",
          (i.priority as string) ?? "",
          (i.date_sent as string) ?? "",
          (i.last_update as string) ?? "",
          (i.next_follow_up_date as string) ?? "",
          (i.outcome as string) ?? "",
          (i.comment as string) ?? "",
        ];
      });

      const escape = (v: string) => {
        if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
        return v;
      };

      const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "warroom-interactions-" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="max-w-md space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Export</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Download all interactions as a CSV file.
        </p>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting}>
          {exporting ? "Exporting…" : "Export to CSV"}
        </Button>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Account</h2>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </section>
    </div>
  );
}
