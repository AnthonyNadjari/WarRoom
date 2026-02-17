"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { CompanyActions } from "./company-actions";
import type { Company, Contact, Interaction } from "@/types/database";
import { getFollowUpSeverity } from "@/lib/follow-up";
import { cn } from "@/lib/utils";

type InteractionWithContact = Interaction & {
  contact?: { id: string; first_name: string | null; last_name: string | null } | null;
};

const SENIORITY_ORDER: Record<string, number> = {
  Partner: 0,
  MD: 1,
  Director: 2,
  VP: 3,
  Associate: 4,
  Analyst: 5,
  HR: 6,
  Recruiter: 7,
  Other: 8,
};

function sortContactsBySeniority(contacts: Contact[]) {
  return [...contacts].sort((a, b) => {
    const orderA = SENIORITY_ORDER[a.seniority ?? "Other"] ?? 8;
    const orderB = SENIORITY_ORDER[b.seniority ?? "Other"] ?? 8;
    return orderA - orderB;
  });
}

function buildContactTree(contacts: Contact[]) {
  const byId = new Map(contacts.map((c) => [c.id, c]));
  const roots: Contact[] = [];
  const children = new Map<string, Contact[]>();

  for (const c of contacts) {
    if (!c.manager_id) {
      roots.push(c);
    } else {
      const list = children.get(c.manager_id) ?? [];
      list.push(c);
      children.set(c.manager_id, list);
    }
  }

  const sortedRoots = sortContactsBySeniority(roots);
  for (const list of children.values()) {
    list.sort(
      (a, b) =>
        (SENIORITY_ORDER[a.seniority ?? "Other"] ?? 8) -
        (SENIORITY_ORDER[b.seniority ?? "Other"] ?? 8)
    );
  }

  return { roots: sortedRoots, children };
}

function ContactCard({
  contact,
  depth,
  lastContactDate,
}: {
  contact: Contact;
  depth: number;
  lastContactDate?: string | null;
}) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—";

  return (
    <div
      style={{ marginLeft: depth * 16 }}
      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">
          {contact.exact_title ?? "—"}
          {contact.seniority && (
            <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">
              {contact.seniority}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-xs text-muted-foreground">
        {lastContactDate
          ? new Date(lastContactDate).toLocaleDateString()
          : "—"}
      </div>
    </div>
  );
}

function ContactTree({
  contacts,
  interactions,
}: {
  contacts: Contact[];
  interactions: Interaction[];
}) {
  const lastByContact = new Map<string, string>();
  for (const i of interactions) {
    const key = i.date_sent ?? i.last_update ?? i.created_at;
    if (key) {
      const existing = lastByContact.get(i.contact_id);
      if (!existing || key > existing) lastByContact.set(i.contact_id, key);
    }
  }

  const { roots, children } = buildContactTree(contacts);

  function renderContact(c: Contact, depth: number) {
    const last = lastByContact.get(c.id);
    return (
      <div key={c.id} className="space-y-1">
        <ContactCard contact={c} depth={depth} lastContactDate={last} />
        {(children.get(c.id) ?? []).map((child) =>
          renderContact(child, depth + 1)
        )}
      </div>
    );
  }

  if (roots.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
        No contacts yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {roots.map((r) => renderContact(r, 0))}
    </div>
  );
}

export function CompanyDetailClient({
  company,
  contacts,
  interactions,
  defaultTab,
}: {
  company: Company;
  contacts: Contact[];
  interactions: InteractionWithContact[];
  defaultTab: "interactions" | "people";
}) {
  const [tab, setTab] = useState(defaultTab);

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/companies">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{company.name}</h1>
          <p className="text-sm text-muted-foreground">
            {company.type ?? "—"} {company.main_location ? `· ${company.main_location}` : ""}
          </p>
        </div>
        <CompanyActions companyId={company.id} companyName={company.name} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "interactions" | "people")}>
        <TabsList>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
        </TabsList>
        <TabsContent value="interactions" className="mt-4">
          {interactions.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              No interactions yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {interactions.map((i) => {
                const severity = getFollowUpSeverity(i);
                const contact = i.contact;
                const name = contact
                  ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
                  : "—";
                return (
                  <li key={i.id}>
                    <Link
                      href={`/interactions?highlight=${i.id}`}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/50",
                        severity === "red" && "border-destructive/50 bg-destructive/5",
                        severity === "orange" && "border-amber-500/50 bg-amber-500/5"
                      )}
                    >
                      <span>{name}</span>
                      <span className="text-muted-foreground">
                        {i.role_title ?? "—"} · {i.status}
                        {i.date_sent && ` · ${new Date(i.date_sent).toLocaleDateString()}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="people" className="mt-4">
          <div className="mb-2 flex justify-end">
            <Button size="sm" asChild>
              <Link href={"/companies/" + company.id + "/contacts/new"}>
                <Plus className="h-4 w-4" />
                Add contact
              </Link>
            </Button>
          </div>
          <ContactTree contacts={contacts} interactions={interactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
