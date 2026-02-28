"use client";

import { useState, useMemo, useEffect, Suspense, Fragment } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Filter, X, Trash2, FolderKanban, List, CheckCircle2, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { getFollowUpSeverity } from "@/lib/follow-up";
import { buildInteractionTree } from "@/lib/interaction-tree";
import {
  getInteractionsWithRelations,
  createInteraction,
  getContactsForCompany,
  getRecruitersForSelect,
  deleteInteraction,
} from "@/app/actions/interactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  InteractionSourceType,
  Priority,
  InteractionGlobalCategory,
  InteractionType,
  Company,
} from "@/types/database";
import { cn, formatDate } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";

type InteractionRow = Interaction & {
  company?: { id: string; name: string; website_domain?: string | null; logo_url?: string | null } | null;
  contact?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  recruiter?: { id: string; name: string } | null;
  process?: { id: string; role_title: string; status: string } | null;
  parentInteraction?: { id: string; role_title: string | null; type: string | null; date_sent: string | null; company?: { name: string } | null } | null;
};

type ProcessSelect = {
  id: string;
  role_title: string;
  status: string;
  company: { id: string; name: string } | null;
};

const STATUS_OPTIONS: InteractionStatus[] = [
  "Sent",
  "Waiting",
  "Follow-up",
  "Discussion",
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

const TYPE_OPTIONS: InteractionType[] = [
  "Official Application",
  "LinkedIn Message",
  "Cold Email",
  "Call",
  "Referral",
  "Physical Meeting",
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        status === "Interview" &&
          "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
        status === "Offer" &&
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
        status === "Rejected" &&
          "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
        status === "Sent" &&
          "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
        status === "Waiting" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
        status === "Follow-up" &&
          "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
        status === "Discussion" &&
          "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        status === "Closed" && "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string | null }) {
  if (!priority) return null;
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        priority === "High" && "bg-red-500",
        priority === "Medium" && "bg-amber-500",
        priority === "Low" && "bg-emerald-500"
      )}
      title={priority}
    />
  );
}

function FollowUpBadge({ interaction }: { interaction: Interaction }) {
  const severity = getFollowUpSeverity(interaction);
  if (severity === "normal") return null;
  const processId = (interaction as { process_id?: string; process?: { id: string } }).process_id ?? (interaction as { process?: { id: string } }).process?.id;
  const content = (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        severity === "red" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        severity === "orange" &&
          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      )}
    >
      {severity === "red" ? "Overdue" : "Soon"}
    </span>
  );
  if (processId) {
    return (
      <Link href={`/processes/${processId}`} onClick={(e) => e.stopPropagation()}>
        {content}
      </Link>
    );
  }
  return content;
}

function NewInteractionDialog({
  open,
  onOpenChange,
  companies,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Pick<Company, "id" | "name">[];
  onCreated: () => void;
}) {
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [contacts, setContacts] = useState<
    { id: string; firstName: string | null; lastName: string | null; exactTitle: string | null }[]
  >([]);
  const [roleTitle, setRoleTitle] = useState("");
  const [roleTitleManual, setRoleTitleManual] = useState(false);
  const [type, setType] = useState<InteractionType | "">("");
  const [status, setStatus] = useState<InteractionStatus>("Sent");
  const [priority, setPriority] = useState<Priority | "">("");
  const [category, setCategory] = useState<InteractionGlobalCategory | "">("");
  const [dateSent, setDateSent] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [comment, setComment] = useState("");
  const [sourceType, setSourceType] = useState<InteractionSourceType>("Direct");
  const [recruiterId, setRecruiterId] = useState("");
  const [recruiters, setRecruiters] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setContacts([]);
      setContactId("");
      return;
    }
    setLoadingContacts(true);
    getContactsForCompany(companyId).then((data) => {
      setContacts(data);
      setContactId("");
      setLoadingContacts(false);
    });
  }, [companyId]);

  // Autofill roleTitle from contact's exactTitle only when roleTitle is empty (do not overwrite manual edits)
  useEffect(() => {
    if (!contactId || roleTitleManual) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact?.exactTitle || roleTitle.trim() !== "") return;
    setRoleTitle(contact.exactTitle);
  }, [contactId, contacts, roleTitleManual, roleTitle]);

  useEffect(() => {
    if (sourceType === "Via Recruiter" && recruiters.length === 0) {
      getRecruitersForSelect().then(setRecruiters);
    }
  }, [sourceType, recruiters.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !contactId) return;
    if (sourceType === "Via Recruiter" && !recruiterId) return;
    setSaving(true);
    await createInteraction({
      company_id: companyId,
      contact_id: contactId,
      role_title: roleTitle || null,
      global_category: (category as InteractionGlobalCategory) || null,
      type: (type as InteractionType) || null,
      status,
      priority: (priority as Priority) || null,
      date_sent: dateSent || null,
      comment: comment || null,
      source_type: sourceType,
      recruiter_id: sourceType === "Via Recruiter" ? recruiterId : null,
    });
    setSaving(false);
    onOpenChange(false);
    setCompanyId("");
    setContactId("");
    setRoleTitle("");
    setRoleTitleManual(false);
    setType("");
    setStatus("Sent");
    setPriority("");
    setCategory("");
    setDateSent(new Date().toISOString().slice(0, 10));
    setComment("");
    setSourceType("Direct");
    setRecruiterId("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Interaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Company *</Label>
                <Link
                  href="/companies/new"
                  className="text-[11px] text-primary hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  + New company
                </Link>
              </div>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.filter((c) => c.id != null && c.id !== "").map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contact *</Label>
                {companyId && !loadingContacts && contacts.length === 0 && (
                  <Link
                    href={`/companies/${companyId}/contacts/new`}
                    className="text-[11px] text-primary hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    + Add contact
                  </Link>
                )}
              </div>
              <Select
                value={contactId}
                onValueChange={setContactId}
                disabled={!companyId || loadingContacts}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingContacts
                        ? "Loading..."
                        : !companyId
                          ? "Pick company first"
                          : contacts.length === 0
                            ? "No contacts — add one first"
                            : "Select contact"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {contacts.filter((c) => c.id != null && c.id !== "").map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.firstName, c.lastName].filter(Boolean).join(" ") ||
                        "Unnamed"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Role title</Label>
            <Input
              value={roleTitle}
              onChange={(e) => {
                setRoleTitle(e.target.value);
                setRoleTitleManual(true);
              }}
              placeholder="e.g. Analyst — S&T"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as InteractionType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as InteractionStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Priority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) =>
                  setCategory(v as InteractionGlobalCategory)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date sent</Label>
              <DateInput value={dateSent} onChange={setDateSent} placeholder="JJ/MM/AAAA" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Comment</Label>
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Notes..."
            />
          </div>
          <div className={cn("grid gap-4", sourceType === "Via Recruiter" ? "grid-cols-2" : "grid-cols-1")}>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={sourceType}
                onValueChange={(v) => {
                  setSourceType(v as InteractionSourceType);
                  if (v === "Direct") setRecruiterId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="Via Recruiter">Via Recruiter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sourceType === "Via Recruiter" && (
              <div className="space-y-2">
                <Label>Recruiter *</Label>
                <Select value={recruiterId || "__none__"} onValueChange={(v) => setRecruiterId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recruiter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {recruiters.filter((r) => r.id != null && r.id !== "").map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !companyId || !contactId || (sourceType === "Via Recruiter" && !recruiterId)}>
              {saving ? "Creating..." : "Create interaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InteractionsInner(props: {
  initialInteractions: InteractionRow[];
  companies: Pick<Company, "id" | "name">[];
  processes: ProcessSelect[];
}) {
  const { companies, processes } = props;
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [processFilter, setProcessFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interactions, setInteractions] = useState(props.initialInteractions);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"flat" | "grouped">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("warroom-view-mode") as "flat" | "grouped") || "flat";
    }
    return "flat";
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const selectedInteraction = selectedId
    ? interactions.find((i) => i.id === selectedId)
    : null;

  const hasFilters =
    statusFilter !== "all" ||
    companyFilter !== "all" ||
    priorityFilter !== "all" ||
    categoryFilter !== "all" ||
    processFilter !== "all" ||
    dateFrom ||
    dateTo;

  const filtered = useMemo(() => {
    let list = [...interactions];
    if (statusFilter !== "all")
      list = list.filter((i) => i.status === statusFilter);
    if (companyFilter !== "all")
      list = list.filter((i) => i.company_id === companyFilter);
    if (priorityFilter !== "all")
      list = list.filter((i) => i.priority === priorityFilter);
    if (categoryFilter !== "all")
      list = list.filter((i) => i.global_category === categoryFilter);
    if (processFilter !== "all") {
      if (processFilter === "none") {
        list = list.filter((i) => !i.process_id);
      } else {
        list = list.filter((i) => i.process_id === processFilter);
      }
    }
    if (dateFrom)
      list = list.filter((i) => i.date_sent && i.date_sent >= dateFrom);
    if (dateTo)
      list = list.filter((i) => i.date_sent && i.date_sent <= dateTo);
    const byId = new Map(list.map((i) => [i.id, i]));
    const roots = list.filter((i) => !i.parent_interaction_id || !byId.has(i.parent_interaction_id));
    const childrenByParent = new Map<string, InteractionRow[]>();
    for (const i of list) {
      if (i.parent_interaction_id && byId.has(i.parent_interaction_id)) {
        const arr = childrenByParent.get(i.parent_interaction_id) ?? [];
        arr.push(i);
        childrenByParent.set(i.parent_interaction_id, arr);
      }
    }
    const dateAsc = (a: InteractionRow, b: InteractionRow) =>
      (a.date_sent ?? "").localeCompare(b.date_sent ?? "");
    const dateDesc = (a: InteractionRow, b: InteractionRow) =>
      (b.date_sent ?? "").localeCompare(a.date_sent ?? "");
    roots.sort(dateAsc);
    childrenByParent.forEach((arr) => arr.sort(dateDesc));
    const ordered: InteractionRow[] = [];
    for (const r of roots) {
      ordered.push(r);
      const children = childrenByParent.get(r.id) ?? [];
      ordered.push(...children);
    }
    return ordered;
  }, [
    interactions,
    statusFilter,
    companyFilter,
    priorityFilter,
    categoryFilter,
    processFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    localStorage.setItem("warroom-view-mode", viewMode);
  }, [viewMode]);

  function toggleGroup(processId: string) {
    setExpandedGroups((prev) => ({ ...prev, [processId]: !prev[processId] }));
  }

  const parentIdsWithChildren = useMemo(
    () => new Set(filtered.filter((i) => i.parent_interaction_id).map((i) => i.parent_interaction_id!)),
    [filtered]
  );
  const visibleFiltered = useMemo(
    () =>
      filtered.filter(
        (i) => !i.parent_interaction_id || expandedParents[i.parent_interaction_id!] !== false
      ),
    [filtered, expandedParents]
  );

  function toggleParentExpanded(parentId: string) {
    setExpandedParents((prev) => ({ ...prev, [parentId]: !(prev[parentId] ?? true) }));
  }

  const grouped = useMemo(() => {
    if (viewMode !== "grouped") return null;
    const processMap = new Map<string, { process: NonNullable<InteractionRow["process"]>; items: InteractionRow[] }>();
    const ungrouped: InteractionRow[] = [];

    for (const i of filtered) {
      if (i.process_id && i.process) {
        const existing = processMap.get(i.process_id);
        if (existing) {
          existing.items.push(i);
        } else {
          processMap.set(i.process_id, { process: i.process, items: [i] });
        }
      } else {
        ungrouped.push(i);
      }
    }

    return { processes: Array.from(processMap.entries()), ungrouped };
  }, [filtered, viewMode]);

  async function refetch() {
    const data = await getInteractionsWithRelations();
    setInteractions(data as InteractionRow[]);
  }

  function clearFilters() {
    setStatusFilter("all");
    setCompanyFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setProcessFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="flex flex-1 flex-col p-5 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} interaction{filtered.length !== 1 ? "s" : ""}
            {hasFilters ? " (filtered)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <button
              onClick={() => setViewMode("flat")}
              className={cn(
                "rounded-md p-1.5 text-xs transition-colors",
                viewMode === "flat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="Flat view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grouped")}
              className={cn(
                "rounded-md p-1.5 text-xs transition-colors",
                viewMode === "grouped" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              title="Grouped by process"
            >
              <FolderKanban className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(hasFilters && "border-primary text-primary")}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filters
            {hasFilters && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilters();
                }}
                className="ml-1.5 rounded-full p-0.5 hover:bg-accent"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Button>
          <Button size="sm" onClick={() => setShowNewDialog(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New interaction
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.filter((c) => c.id != null && c.id !== "").map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
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
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
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
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {processes.length > 0 && (
            <Select value={processFilter} onValueChange={setProcessFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Process" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All processes</SelectItem>
                <SelectItem value="none">No process</SelectItem>
                {processes.filter((p) => p.id != null && p.id !== "").map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.company?.name ?? "—"} — {p.role_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DateInput
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="Du"
            className="w-[140px]"
          />
          <DateInput
            value={dateTo}
            onChange={setDateTo}
            placeholder="Au"
            className="w-[140px]"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground">
            {interactions.length === 0
              ? "No interactions yet. Create your first one to get started."
              : "No interactions match your filters."}
          </p>
          {interactions.length === 0 && (
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setShowNewDialog(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create interaction
            </Button>
          )}
        </div>
      ) : viewMode === "grouped" && grouped ? (
        <div className="space-y-3">
          {grouped.processes.map(([processId, { process, items }]) => (
            <div key={processId} className="glass-card overflow-hidden">
              <button
                onClick={() => toggleGroup(processId)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
              >
                {expandedGroups[processId] ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{process.role_title}</span>
                </div>
                <StatusBadge status={process.status} />
                <span className="text-xs text-muted-foreground ml-1">{items.length}</span>
              </button>
              {expandedGroups[processId] && (
                <div className="border-t divide-y">
                  {buildInteractionTree(items).map(({ item: i, depth }) => {
                    const contact = i.contact;
                    const name = contact
                      ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
                      : "—";
                    return (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setSelectedId(i.id)}
                        className={cn(
                          "flex w-full items-center gap-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/30 cursor-pointer",
                          depth === 0 ? "px-4" : "pl-4 pr-4 border-l-2 border-l-primary/40 ml-4",
                          highlightId === i.id && "bg-accent"
                        )}
                      >
                        {depth > 0 && <span className="text-muted-foreground shrink-0 w-4">↳</span>}
                        {i.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{name}</span>
                            <span className="text-muted-foreground truncate">{i.role_title ?? ""}</span>
                          </div>
                          {i.comment && (
                            <p
                              className="text-xs text-muted-foreground truncate max-w-[400px] mt-0.5"
                              title={i.comment}
                            >
                              {i.comment.length > 180 ? i.comment.slice(0, 180) + "…" : i.comment}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={i.status} />
                        {i.priority && <PriorityDot priority={i.priority} />}
                        <span className="text-xs text-muted-foreground shrink-0">
                          {i.date_sent ? formatDate(i.date_sent) : ""}
                        </span>
                        <FollowUpBadge interaction={i} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {grouped.ungrouped.length > 0 && (
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => toggleGroup("__ungrouped__")}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
              >
                {expandedGroups["__ungrouped__"] ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-muted-foreground">Ungrouped</span>
                </div>
                <span className="text-xs text-muted-foreground">{grouped.ungrouped.length}</span>
              </button>
              {expandedGroups["__ungrouped__"] && (
                <div className="border-t divide-y">
                  {grouped.ungrouped.map((i) => {
                    const company = i.company as { name?: string } | null;
                    const contact = i.contact;
                    const name = contact
                      ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
                      : "—";
                    return (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => setSelectedId(i.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/30 cursor-pointer",
                          highlightId === i.id && "bg-accent"
                        )}
                      >
                        {i.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{company?.name ?? "—"}</span>
                            <span className="text-muted-foreground truncate">{name}</span>
                            <span className="text-muted-foreground truncate">{i.role_title ?? ""}</span>
                          </div>
                          {i.comment && (
                            <p
                              className="text-xs text-muted-foreground truncate max-w-[400px] mt-0.5"
                              title={i.comment}
                            >
                              {i.comment.length > 180 ? i.comment.slice(0, 180) + "…" : i.comment}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={i.status} />
                        {i.priority && <PriorityDot priority={i.priority} />}
                        <span className="text-xs text-muted-foreground shrink-0">
                          {i.date_sent ? formatDate(i.date_sent) : ""}
                        </span>
                        <FollowUpBadge interaction={i} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="glass-card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium"></th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Process</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {visibleFiltered.map((i) => {
                  const severity = getFollowUpSeverity(i);
                  const company = i.company as { name?: string } | null;
                  const contact = i.contact;
                  const name = contact
                    ? [contact.first_name, contact.last_name]
                        .filter(Boolean)
                        .join(" ")
                    : "—";
                  const isExpanded = expandedId === i.id;
                  const hasChildren = parentIdsWithChildren.has(i.id);
                  const isParentExpanded = expandedParents[i.id] !== false;
                  return (
                    <Fragment key={i.id}>
                    <tr
                      id={`row-${i.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedId((prev) => (prev === i.id ? null : i.id))}
                      onKeyDown={(e) =>
                        e.key === "Enter" && setExpandedId((prev) => (prev === i.id ? null : i.id))
                      }
                      className={cn(
                        "border-b transition-colors hover:bg-accent/30 cursor-pointer",
                        i.parent_interaction_id && "border-l-4 border-l-primary/50 bg-muted/20",
                        !i.parent_interaction_id && (i.process_id || parentIdsWithChildren.has(i.id)) && "border-l-2 border-l-primary/40",
                        highlightId === i.id && "bg-accent",
                        severity === "red" &&
                          "bg-red-50/50 dark:bg-red-950/20",
                        severity === "orange" &&
                          "bg-amber-50/50 dark:bg-amber-950/20"
                      )}
                    >
                      <td
                        className={cn(
                          "px-4 py-3",
                          i.parent_interaction_id && "pl-16"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleParentExpanded(i.id)}
                              className="shrink-0 rounded p-0.5 hover:bg-accent"
                              aria-label={isParentExpanded ? "Collapse" : "Expand"}
                            >
                              {isParentExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          ) : i.parent_interaction_id ? (
                            <span className="shrink-0 text-muted-foreground" aria-hidden>↳</span>
                          ) : null}
                          {i.completed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={"/companies/" + i.company_id}
                            className="font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {company?.name ?? "—"}
                          </Link>
                          {i.source_type === "Via Recruiter" && i.recruiter && (
                            <Link
                              href={"/companies/" + i.recruiter.id}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/60"
                            >
                              via {i.recruiter.name}
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground min-w-0">
                        <div>
                          {name}
                          {i.comment && (
                            <p
                              className="text-xs text-muted-foreground truncate max-w-[400px] mt-0.5"
                              title={i.comment}
                            >
                              {i.comment.length > 180 ? i.comment.slice(0, 180) + "…" : i.comment}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {i.role_title ?? "—"}
                      </td>
                      <td
                        className="px-4 py-3 text-muted-foreground max-w-[200px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          {i.process ? (
                            <Link
                              href={`/processes/${i.process.id}`}
                              className="inline-flex w-fit max-w-full items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 break-words text-left"
                              title={i.process.role_title}
                            >
                              {i.process.role_title}
                            </Link>
                          ) : (
                            "—"
                          )}
                          {i.parentInteraction && !i.process && (
                            <Link
                              href={`#row-${i.parentInteraction.id}`}
                              className="text-xs text-muted-foreground hover:underline cursor-pointer"
                            >
                              ↳ After: {i.parentInteraction.company?.name ?? "—"}
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <PriorityDot priority={i.priority} />
                          <span className="text-muted-foreground">
                            {i.priority ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {i.date_sent
                          ? formatDate(i.date_sent)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <FollowUpBadge interaction={i} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-muted/30">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
                            <div><span className="text-muted-foreground">Date</span><br />{i.date_sent ? formatDate(i.date_sent) : "—"}</div>
                            <div><span className="text-muted-foreground">Next follow-up</span><br />{i.next_follow_up_date ? formatDate(i.next_follow_up_date) : "—"}</div>
                            <div><span className="text-muted-foreground">Type</span><br />{i.type ?? "—"}</div>
                            <div><span className="text-muted-foreground">Status</span><br /><StatusBadge status={i.status} /></div>
                            <div><span className="text-muted-foreground">Priority</span><br />{i.priority ?? "—"}</div>
                            <div><span className="text-muted-foreground">Category</span><br />{i.global_category ?? "—"}</div>
                            {i.comment && (
                              <div className="col-span-2 md:col-span-3"><span className="text-muted-foreground">Comment</span><br /><p className="mt-0.5 whitespace-pre-wrap break-words">{i.comment}</p></div>
                            )}
                            <div><span className="text-muted-foreground">Process</span><br />{i.process ? i.process.role_title : "—"}</div>
                            {i.parentInteraction && (
                              <div className="col-span-2 md:col-span-3"><span className="text-muted-foreground">Follow-up to</span><br />{i.parentInteraction.company?.name ?? "—"} — {i.parentInteraction.role_title ?? "—"} — {i.parentInteraction.date_sent ? formatDate(i.parentInteraction.date_sent) : "—"}</div>
                            )}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(null);
                                setSelectedId(i.id);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(null);
                              }}
                            >
                              Close
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {visibleFiltered.map((i) => {
              const severity = getFollowUpSeverity(i);
              const company = i.company as { name?: string } | null;
              const contact = i.contact;
              const name = contact
                ? [contact.first_name, contact.last_name]
                    .filter(Boolean)
                    .join(" ")
                : "—";
              const isExpandedMobile = expandedId === i.id;
              return (
                <li key={i.id} className={cn(i.parent_interaction_id && "ml-4 border-l-4 border-l-primary/50 pl-3")}>
                  <button
                    type="button"
                    onClick={() => setExpandedId((prev) => (prev === i.id ? null : i.id))}
                    className={cn(
                      "block w-full rounded-xl border bg-card p-4 text-left text-sm transition-all hover:shadow-sm",
                      !i.parent_interaction_id && (i.process_id || parentIdsWithChildren.has(i.id)) && "border-l-4 border-l-primary/50",
                      severity === "red" &&
                        "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30",
                      severity === "orange" &&
                        "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {i.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                        <span className="font-semibold">
                          {company?.name ?? "—"}
                        </span>
                      </div>
                      <StatusBadge status={i.status} />
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {name} · {i.role_title ?? "—"}
                    </div>
                    {i.comment && (
                      <p
                        className="text-xs text-muted-foreground truncate max-w-[400px] mt-0.5"
                        title={i.comment}
                      >
                        {i.comment.length > 180 ? i.comment.slice(0, 180) + "…" : i.comment}
                      </p>
                    )}
                    {i.parentInteraction && !i.process && (
                      <Link
                        href={`#row-${i.parentInteraction.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 block text-xs text-muted-foreground hover:underline cursor-pointer"
                      >
                        ↳ After: {i.parentInteraction.company?.name ?? "—"}
                      </Link>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {i.process && (
                        <Link
                          href={`/processes/${i.process.id}`}
                          onClick={(e) => e.stopPropagation()}
                          title={i.process.role_title}
                          className="inline-flex max-w-full items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 break-words"
                        >
                          {i.process.role_title}
                        </Link>
                      )}
                      {i.source_type === "Via Recruiter" && i.recruiter && (
                        <Link
                          href={"/companies/" + i.recruiter.id}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/60"
                        >
                          via {i.recruiter.name}
                        </Link>
                      )}
                      {i.priority && (
                        <div className="flex items-center gap-1">
                          <PriorityDot priority={i.priority} />
                          <span className="text-xs">{i.priority}</span>
                        </div>
                      )}
                      {i.date_sent && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(i.date_sent)}
                        </span>
                      )}
                      <FollowUpBadge interaction={i} />
                    </div>
                  </button>
                  {isExpandedMobile && (
                    <div className="mt-2 rounded-xl border bg-muted/30 p-4 text-sm">
                      <div className="grid gap-2">
                        <div><span className="text-muted-foreground">Date</span>: {i.date_sent ? formatDate(i.date_sent) : "—"}</div>
                        <div><span className="text-muted-foreground">Type</span>: {i.type ?? "—"}</div>
                        <div><span className="text-muted-foreground">Status</span>: <StatusBadge status={i.status} /></div>
                        {i.comment && <div><span className="text-muted-foreground">Comment</span>: <p className="mt-0.5 whitespace-pre-wrap break-words">{i.comment}</p></div>}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => { setExpandedId(null); setSelectedId(i.id); }}>Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => setExpandedId(null)}>Close</Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Sheet
        open={!!selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent className="flex flex-col overflow-hidden">
          <div className="flex flex-1 min-h-0 flex-col overflow-y-auto gap-6 pb-6 pr-2">
          <SheetHeader className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <SheetTitle>
                  {selectedInteraction
                    ? (selectedInteraction.company as { name?: string })?.name +
                      " · " +
                      (selectedInteraction.contact
                        ? [
                            selectedInteraction.contact.first_name,
                            selectedInteraction.contact.last_name,
                          ]
                            .filter(Boolean)
                            .join(" ")
                        : "")
                    : "Interaction"}
                </SheetTitle>
                {selectedInteraction?.updated_at && (
                  <p className="text-xs text-muted-foreground">
                    Last updated: {formatDate(selectedInteraction.updated_at)}
                  </p>
                )}
              </div>
              {selectedInteraction && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete interaction"
                  onClick={async () => {
                    if (!window.confirm("Delete this interaction? This cannot be undone.")) return;
                    await deleteInteraction(selectedInteraction.id);
                    setSelectedId(null);
                    refetch();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {selectedInteraction?.parentInteraction && (
              <Link
                href={selectedInteraction.process?.id ? `/processes/${selectedInteraction.process.id}` : `/interactions?highlight=${selectedInteraction.parentInteraction.id}`}
                className="text-xs text-muted-foreground hover:underline"
                onClick={() => setSelectedId(null)}
              >
                ↳ Follow-up to: {selectedInteraction.parentInteraction.company?.name ?? "—"} — {selectedInteraction.parentInteraction.role_title ?? "—"} — {selectedInteraction.parentInteraction.date_sent ? formatDate(selectedInteraction.parentInteraction.date_sent) : "—"}
              </Link>
            )}
          </SheetHeader>
          {selectedInteraction && (
            <div className="pt-2">
              <InteractionForm
                interaction={selectedInteraction}
                onSaved={refetch}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
          </div>
        </SheetContent>
      </Sheet>

      <NewInteractionDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        companies={companies}
        onCreated={refetch}
      />
    </div>
  );
}

export function InteractionsClient(props: {
  initialInteractions: InteractionRow[];
  companies: Pick<Company, "id" | "name">[];
  processes: ProcessSelect[];
}) {
  return (
    <Suspense>
      <InteractionsInner {...props} />
    </Suspense>
  );
}
