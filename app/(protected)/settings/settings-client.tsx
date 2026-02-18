"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getInteractionsForExport } from "@/app/actions/settings";
import { interactionStatusToApi } from "@/lib/map-prisma";

export function SettingsClient() {
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  async function handleExportCSV() {
    setExporting(true);
    try {
      const data = await getInteractionsForExport();
      if (!data) return;

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

      const rows = data.map((i) => {
        const company = i.company;
        const contact = i.contact;
        const name = contact
          ? [contact.firstName, contact.lastName].filter(Boolean).join(" ")
          : "";
        return [
          company?.name ?? "",
          name,
          contact?.email ?? "",
          i.roleTitle ?? "",
          i.globalCategory ?? "",
          i.type ?? "",
          interactionStatusToApi(i.status),
          i.priority ?? "",
          i.dateSent?.toISOString().slice(0, 10) ?? "",
          i.lastUpdate?.toISOString().slice(0, 10) ?? "",
          i.nextFollowUpDate?.toISOString().slice(0, 10) ?? "",
          i.outcome ?? "",
          i.comment ?? "",
        ];
      });

      const escape = (v: string) => {
        if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
        return v;
      };

      const csv = [
        headers.map(escape).join(","),
        ...rows.map((r) => r.map(String).map(escape).join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        "warroom-interactions-" + new Date().toISOString().slice(0, 10) + ".csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="max-w-md space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Export
        </h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Download all interactions as a CSV file.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCSV}
          disabled={exporting}
        >
          {exporting ? "Exporting…" : "Export to CSV"}
        </Button>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Account
        </h2>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign out
        </Button>
      </section>
    </div>
  );
}
