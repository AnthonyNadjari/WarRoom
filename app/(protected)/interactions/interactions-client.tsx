"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getFollowUpSeverity } from "@/lib/follow-up";
import { getInteractionsWithRelations } from "@/app/actions/interactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InteractionForm } from "@/components/interaction-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Interaction,
  InteractionStatus,
  Priority,
  InteractionGlobalCategory,
  Company,
} from "@/types/database";
import { cn } from "@/lib/utils";

type InteractionRow = Interaction & {
  company?: { id: string; name: string } | null;
  contact?: { id: string; first_name: string | null; last_name: string | null } | null;
};

const STATUS_OPTIONS: InteractionStatus[] = [
  "Sent",
  "Waiting",
  "Follow-up",
  "Interview",
  "Offer",
  "Rejected",
  "Closed",
];

const PRIORITY_OPTIONS: Priority[] = ["Low", "Medium", "High"];

const CATEGORY_OPTIONS: InteractionGlobalCategory[] = [
  "Sales",
  "Trading",
  "Structuring",
  "Investment",
  "Other",
];

function FollowUpBadge({ interaction }: { interaction: Interaction }) {
  const severity = getFollowUpSeverity(interaction);
  if (severity === "normal") return null;
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium",
        severity === "red" && "bg-destructive/20 text-destructive",
        severity === "orange" && "bg-amber-500/20 text-amber-700 dark:text-amber-400"
      )}
    >
      {severity === "red" ? "Overdue" : "Follow-up"}
    </span>
  );
}

export function InteractionsClient(props: {
  initialInteractions: InteractionRow[];
  companies: Pick<Company, "id" | "name">[];
}) {
  const { initialInteractions, companies } = props;
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interactions, setInteractions] = useState(props.initialInteractions);
  const selectedInteraction = selectedId ? interactions.find((i) => i.id === selectedId) : null;

  const filtered = useMemo(() => {
    let list = [...interactions];
    if (statusFilter !== "all") list = list.filter((i) => i.status === statusFilter);
    if (companyFilter !== "all") list = list.filter((i) => i.company_id === companyFilter);
    if (priorityFilter !== "all") list = list.filter((i) => i.priority === priorityFilter);
    if (categoryFilter !== "all") list = list.filter((i) => i.global_category === categoryFilter);
    if (dateFrom) list = list.filter((i) => i.date_sent && i.date_sent >= dateFrom);
    if (dateTo) list = list.filter((i) => i.date_sent && i.date_sent <= dateTo);
    return list;
  }, [
    interactions,
    statusFilter,
    companyFilter,
    priorityFilter,
    categoryFilter,
    dateFrom,
    dateTo,
  ]);

  async function refetch() {
    const data = await getInteractionsWithRelations();
    setInteractions(data as InteractionRow[]);
  }

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Interactions</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORY_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          placeholder="From"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[130px]"
        />
        <Input
          type="date"
          placeholder="To"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[130px]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No interactions match your filters.
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">Company</th>
                  <th className="p-2 font-medium">Contact</th>
                  <th className="p-2 font-medium">Role</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Priority</th>
                  <th className="p-2 font-medium">Date sent</th>
                  <th className="p-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const severity = getFollowUpSeverity(i);
                  const company = i.company as { name?: string } | null;
                  const contact = i.contact;
                  const name = contact
                    ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
                    : "—";
                  return (
                    <tr
                      key={i.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(i.id)}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedId(i.id)}
                      className={cn(
                        "border-b transition-colors hover:bg-accent/30",
                        highlightId === i.id && "bg-accent",
                        severity === "red" && "bg-destructive/5",
                        severity === "orange" && "bg-amber-500/5"
                      )}
                    >
                      <td className="p-2">
                        <Link href={"/companies/" + i.company_id} className="hover:underline">
                          {company?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="p-2">{name}</td>
                      <td className="p-2">{i.role_title ?? "—"}</td>
                      <td className="p-2">{i.status}</td>
                      <td className="p-2">{i.priority ?? "—"}</td>
                      <td className="p-2">
                        {i.date_sent ? new Date(i.date_sent).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-2">
                        <FollowUpBadge interaction={i} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Sheet open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>
                  {selectedInteraction
                    ? (selectedInteraction.company as { name?: string })?.name + " · " +
                      (selectedInteraction.contact
                        ? [selectedInteraction.contact.first_name, selectedInteraction.contact.last_name].filter(Boolean).join(" ")
                        : "")
                    : "Interaction"}
                </SheetTitle>
              </SheetHeader>
              {selectedInteraction && (
                <InteractionForm
                  interaction={selectedInteraction}
                  onSaved={refetch}
                  onClose={() => setSelectedId(null)}
                />
              )}
            </SheetContent>
          </Sheet>

          <ul className="space-y-2 md:hidden">
            {filtered.map((i) => {
              const severity = getFollowUpSeverity(i);
              const company = i.company as { name?: string } | null;
              const contact = i.contact;
              const name = contact
                ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
                : "—";
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(i.id)}
                    className={cn(
                      "block rounded-md border p-3 text-sm transition-colors hover:bg-accent/50",
                      severity === "red" && "border-destructive/50 bg-destructive/5",
                      severity === "orange" && "border-amber-500/50 bg-amber-500/5"
                    )}
                  >
                    <div className="font-medium">{company?.name ?? "—"}</div>
                    <div className="text-muted-foreground">{name} · {i.role_title ?? "—"}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span>{i.status}</span>
                      <span>{i.priority ?? "—"}</span>
                      {i.date_sent && (
                        <span>{new Date(i.date_sent).toLocaleDateString()}</span>
                      )}
                      <FollowUpBadge interaction={i} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
