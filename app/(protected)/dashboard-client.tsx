"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Briefcase,
  Send,
  ArrowRight,
  TrendingUp,
  Building2,
  MessageSquare,
  Users,
} from "lucide-react";
import { getFollowUpSeverity } from "@/lib/follow-up";
import { CompanyLogo } from "@/components/company-logo";
import type { InteractionWithRelations } from "@/types/database";
import { cn, formatDate } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  href?: string;
}) {
  const card = (
    <div className={cn(
      "glass-card flex items-center gap-4 p-5 transition-all",
      href && "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
    )}>
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function InteractionRow({
  i,
  severity,
}: {
  i: InteractionWithRelations;
  severity?: "red" | "orange";
}) {
  const company = i.company;
  const contact = i.contact as { first_name?: string; last_name?: string } | null;
  const name = contact
    ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
    : "\u2014";

  return (
    <Link
      href={`/interactions?highlight=${i.id}`}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-accent/50",
        severity === "red" && "bg-red-50 dark:bg-red-950/30",
        severity === "orange" && "bg-amber-50 dark:bg-amber-950/30"
      )}
    >
      <div className={cn(
        "h-2 w-2 shrink-0 rounded-full",
        severity === "red" ? "bg-red-500" :
        severity === "orange" ? "bg-amber-500" :
        "bg-blue-500"
      )} />
      {company && (
        <CompanyLogo
          name={company.name}
          logoUrl={company.logo_url}
          websiteDomain={company.website_domain}
          size={24}
          className="shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <span className="font-medium">{company?.name ?? "\u2014"}</span>
        <span className="text-muted-foreground"> \u00B7 {name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {i.source_type === "Via Recruiter" && i.recruiter && (
          <span className="hidden sm:inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            via {i.recruiter.name}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {i.date_sent ? formatDate(i.date_sent) : "\u2014"}
        </span>
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
          i.status === "Interview" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" :
          i.status === "Offer" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" :
          i.status === "Rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" :
          "bg-muted text-muted-foreground"
        )}>
          {i.status}
        </span>
      </div>
    </Link>
  );
}

function SectionBlock({
  title,
  icon: Icon,
  items,
  severity,
  emptyMessage,
  accent,
}: {
  title: string;
  icon: React.ElementType;
  items: InteractionWithRelations[];
  severity?: "red" | "orange";
  emptyMessage: string;
  accent?: string;
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className={cn("flex items-center gap-2 border-b px-5 py-3", accent)}>
        <Icon className="h-4 w-4" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ml-auto rounded-full bg-background/50 px-2 py-0.5 text-xs font-medium">
          {items.length}
        </span>
      </div>
      <div className="p-2">
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((i) => (
              <li key={i.id}>
                <InteractionRow i={i} severity={severity} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

type RecruiterSummary = {
  id: string;
  name: string;
  mandates: number;
  interviews: number;
  offers: number;
};

function RecruiterOverview({ interactions }: { interactions: InteractionWithRelations[] }) {
  const recruiterMap = new Map<string, RecruiterSummary>();

  for (const i of interactions) {
    if (i.source_type !== "Via Recruiter" || !i.recruiter) continue;
    const existing = recruiterMap.get(i.recruiter.id) ?? {
      id: i.recruiter.id,
      name: i.recruiter.name,
      mandates: 0,
      interviews: 0,
      offers: 0,
    };
    existing.mandates++;
    if (i.status === "Interview" || i.outcome === "Interview") existing.interviews++;
    if (i.status === "Offer" || i.outcome === "Offer") existing.offers++;
    recruiterMap.set(i.recruiter.id, existing);
  }

  if (recruiterMap.size === 0) return null;

  const ranked = [...recruiterMap.values()]
    .sort((a, b) => b.interviews - a.interviews || b.mandates - a.mandates)
    .slice(0, 5);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-violet-50 px-5 py-3 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
        <Users className="h-4 w-4" />
        <h2 className="text-sm font-semibold">Recruiter Overview</h2>
        <span className="ml-auto rounded-full bg-background/50 px-2 py-0.5 text-xs font-medium">
          {recruiterMap.size}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Recruiter</th>
              <th className="px-5 py-2.5 font-medium text-right">Mandates</th>
              <th className="px-5 py-2.5 font-medium text-right">Interviews</th>
              <th className="px-5 py-2.5 font-medium text-right">Offers</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                <td className="px-5 py-2.5">
                  <Link
                    href={`/companies/${r.id}?tab=performance`}
                    className="font-medium hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground">
                  {r.mandates}
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    r.interviews > 0
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      : "text-muted-foreground"
                  )}>
                    {r.interviews}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right tabular-nums">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    r.offers > 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      : "text-muted-foreground"
                  )}>
                    {r.offers}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DashboardClient({
  initialInteractions,
}: {
  initialInteractions: InteractionWithRelations[];
}) {
  const red: InteractionWithRelations[] = [];
  const orange: InteractionWithRelations[] = [];
  const interview: InteractionWithRelations[] = [];
  const recent: InteractionWithRelations[] = [];

  const statusCounts: Record<string, number> = {};
  for (const i of initialInteractions) {
    statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
    const severity = getFollowUpSeverity(i);
    if (severity === "red") red.push(i);
    else if (severity === "orange") orange.push(i);
    if (i.status === "Interview") interview.push(i);
  }
  for (let idx = 0; idx < Math.min(8, initialInteractions.length); idx++) {
    recent.push(initialInteractions[idx]);
  }

  return (
    <div className="flex-1 p-5 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your applications, follow-ups, and interviews
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total interactions"
            value={initialInteractions.length}
            icon={MessageSquare}
            color="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
            href="/interactions"
          />
          <StatCard
            label="Active interviews"
            value={interview.length}
            icon={Briefcase}
            color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
          />
          <StatCard
            label="Need follow-up"
            value={red.length + orange.length}
            icon={Clock}
            color="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
          />
          <StatCard
            label="Overdue"
            value={red.length}
            icon={AlertTriangle}
            color="bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
          />
        </div>

        <RecruiterOverview interactions={initialInteractions} />

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionBlock
            title="Overdue follow-ups"
            icon={AlertTriangle}
            items={red}
            severity="red"
            emptyMessage="All caught up \u2014 no overdue follow-ups"
            accent="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          />
          <SectionBlock
            title="Upcoming follow-ups"
            icon={Clock}
            items={orange}
            severity="orange"
            emptyMessage="No upcoming follow-ups"
            accent="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
          />
          <SectionBlock
            title="Active interviews"
            icon={Briefcase}
            items={interview}
            emptyMessage="No active interviews"
            accent="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
          />
          <SectionBlock
            title="Recently sent"
            icon={Send}
            items={recent}
            emptyMessage="No interactions yet \u2014 add your first one"
            accent="bg-muted"
          />
        </div>
      </div>
    </div>
  );
}
