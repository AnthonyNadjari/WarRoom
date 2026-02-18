"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users, Mail, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Contact } from "@/types/database";
import { cn } from "@/lib/utils";

type ContactWithCompany = Contact & {
  company?: { id: string; name: string } | null;
};

export function ContactsClient(props: {
  initialContacts: ContactWithCompany[];
}) {
  const { initialContacts } = props;
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const filtered = q
    ? initialContacts.filter((c) => {
        const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
        const companyName =
          (c.company as { name?: string } | null)?.name ?? "";
        return (
          name.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.exact_title ?? "").toLowerCase().includes(q) ||
          companyName.toLowerCase().includes(q)
        );
      })
    : initialContacts;

  return (
    <div className="flex flex-1 flex-col p-5 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {initialContacts.length} contact{initialContacts.length !== 1 ? "s" : ""} across all companies
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 pl-9"
          />
        </div>
      </div>
      <div className="flex-1">
        {filtered.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center p-12 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {initialContacts.length === 0
                ? "No contacts yet. Add one from a company page."
                : "No contacts match your search."}
            </p>
          </div>
        ) : (
          <div className="glass-card divide-y overflow-hidden">
            {filtered.map((c) => {
              const name =
                [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
              const company = c.company as {
                id?: string;
                name?: string;
              } | null;
              return (
                <Link
                  key={c.id}
                  href={
                    company?.id
                      ? "/companies/" + company.id + "?tab=people"
                      : "#"
                  }
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {(c.first_name?.[0] ?? "").toUpperCase()}
                    {(c.last_name?.[0] ?? "").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{name}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {c.exact_title && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {c.exact_title}
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {c.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm text-muted-foreground">
                    {company?.name ?? "—"}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
