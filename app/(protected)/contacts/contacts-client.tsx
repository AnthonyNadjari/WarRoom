"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import type { Contact } from "@/types/database";

type ContactWithCompany = Contact & { company?: { id: string; name: string } | null };

export function ContactsClient(props: { initialContacts: ContactWithCompany[] }) {
  const { initialContacts } = props;
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = q
    ? initialContacts.filter((c) => {
        const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
        const companyName = (c.company as { name?: string } | null)?.name ?? "";
        return (
          name.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.exact_title ?? "").toLowerCase().includes(q) ||
          companyName.toLowerCase().includes(q)
        );
      })
    : initialContacts;

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
        <Input
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <div className="mt-4 flex-1">
        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No contacts match your search.
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((c) => {
              const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
              const company = c.company as { id?: string; name?: string } | null;
              return (
                <li key={c.id}>
                  <Link
                    href={company?.id ? "/companies/" + company.id + "?tab=people" : "#"}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/50"
                  >
                    <span className="font-medium">{name}</span>
                    <span className="text-muted-foreground">
                      {c.exact_title ?? "—"} · {company?.name ?? "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
