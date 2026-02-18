"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, TrendingUp, Briefcase, XCircle, CheckCircle, Activity, Target } from "lucide-react";
import { CompanyActions } from "./company-actions";
import { CompanyLogo } from "@/components/company-logo";
import { getRecruiterStats } from "@/app/actions/interactions";
import type { Company, Contact, Interaction } from "@/types/database";
import { getFollowUpSeverity } from "@/lib/follow-up";
import { cn, formatDate } from "@/lib/utils";

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
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "\u2014";

  return (
    <div
      style={{ marginLeft: depth * 16 }}
      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">
          {contact.exact_title ?? "\u2014"}
          {contact.seniority && (
            <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px]">
              {contact.seniority}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0 text-xs text-muted-foreground">
        {lastContactDate
          ? formatDate(lastContactDate)
          : "\u2014"}
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

type RecruiterStatsData = {
  total: number;
  interviews: number;
  offers: number;
  rejections: number;
  active: number;
  conversionRate: number;
};

function RecruiterPerformance({ companyId }: { companyId: string }) {
  const [stats, setStats] = useState<RecruiterStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecruiterStats(companyId).then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, [companyId]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading stats...</p>;
  }

  if (!stats || stats.total === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
        No mandates tracked via this recruiter yet.
      </p>
    );
  }

  const statCards = [
    { label: "Total mandates", value: stats.total, icon: Target, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" },
    { label: "Interviews", value: stats.interviews, icon: Briefcase, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400" },
    { label: "Offers", value: stats.offers, icon: CheckCircle, color: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400" },
    { label: "Rejections", value: stats.rejections, icon: XCircle, color: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400" },
    { label: "Active", value: stats.active, icon: Activity, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400" },
    { label: "Conversion rate", value: `${stats.conversionRate}%`, icon: TrendingUp, color: "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {statCards.map((s) => (
        <div key={s.label} className="glass-card flex items-center gap-3 p-4">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", s.color)}>
            <s.icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
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
  defaultTab: "interactions" | "people" | "performance";
}) {
  const isRecruiter = company.type === "Recruiter";
  const [tab, setTab] = useState(defaultTab === "performance" && !isRecruiter ? "interactions" : defaultTab);

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/companies">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <CompanyLogo
          name={company.name}
          logoUrl={company.logo_url}
          websiteDomain={company.website_domain}
          size={40}
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{company.name}</h1>
            {isRecruiter && (
              <span className="rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-2 py-0.5 text-[10px] font-semibold">
                Headhunter
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {company.type ?? "\u2014"} {company.main_location ? `\u00B7 ${company.main_location}` : ""}
          </p>
        </div>
        <CompanyActions companyId={company.id} companyName={company.name} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          {isRecruiter && (
            <TabsTrigger value="performance">Performance</TabsTrigger>
          )}
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
                  : "\u2014";
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
                        {i.role_title ?? "\u2014"} {"\u00B7"} {i.status}
                        {i.date_sent && ` \u00B7 ${formatDate(i.date_sent)}`}
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
        {isRecruiter && (
          <TabsContent value="performance" className="mt-4">
            <RecruiterPerformance companyId={company.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
