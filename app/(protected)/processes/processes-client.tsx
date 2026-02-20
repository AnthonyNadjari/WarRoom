"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FolderKanban, MapPin, Building2, ArrowRight, Link2 } from "lucide-react";
import { createProcess } from "@/app/actions/processes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanyLogo } from "@/components/company-logo";
import type { ProcessWithRelations, ProcessStatus } from "@/types/database";
import { cn, formatDate } from "@/lib/utils";

const PROCESS_STATUSES: ProcessStatus[] = [
  "Active",
  "Interviewing",
  "Offer",
  "Rejected",
  "Closed",
];

const STATUS_COLORS: Record<string, string> = {
  Active: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  Interviewing: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  Offer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  Closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const FILTER_TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Interviewing", value: "Interviewing" },
  { label: "Offer", value: "Offer" },
  { label: "Rejected", value: "Rejected" },
  { label: "Closed", value: "Closed" },
];

type CompanySelect = { id: string; name: string };
type ProcessSelect = {
  id: string;
  role_title: string;
  status: string;
  company: { id: string; name: string } | null;
};

function NewProcessDialog({
  open,
  onOpenChange,
  companies,
  allProcesses,
  preselectedCompanyId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companies: CompanySelect[];
  allProcesses: ProcessSelect[];
  preselectedCompanyId?: string;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(preselectedCompanyId ?? "");
  const [roleTitle, setRoleTitle] = useState("");
  const [location, setLocation] = useState("");
  const [sourceProcessId, setSourceProcessId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preselectedCompanyId) setCompanyId(preselectedCompanyId);
  }, [preselectedCompanyId]);

  const handleSubmit = async () => {
    if (!companyId || !roleTitle.trim()) return;
    setSaving(true);
    try {
      const id = await createProcess({
        company_id: companyId,
        role_title: roleTitle.trim(),
        location: location.trim() || null,
        source_process_id: (sourceProcessId === "__none__" ? "" : sourceProcessId).trim() || null,
      });
      onOpenChange(false);
      router.push(`/processes/${id}`);
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Process</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Company *</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role Title *</Label>
            <Input
              placeholder="e.g. Quant Analyst — Rates"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="e.g. London"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Introduced via (optional)</Label>
            <Select value={sourceProcessId || "__none__"} onValueChange={(v) => setSourceProcessId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="None — Direct application" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {allProcesses
                  .filter((p) => p.status !== "Closed" && p.status !== "Rejected")
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.company?.name ?? "—"} — {p.role_title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            disabled={!companyId || !roleTitle.trim() || saving}
            onClick={handleSubmit}
          >
            {saving ? "Creating..." : "Create Process"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProcessesClient({
  initialProcesses,
  companies,
  allProcesses,
  openNew,
  preselectedCompanyId,
}: {
  initialProcesses: ProcessWithRelations[];
  companies: CompanySelect[];
  allProcesses: ProcessSelect[];
  openNew?: boolean;
  preselectedCompanyId?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(openNew ?? false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = initialProcesses;
    if (filter !== "all") {
      list = list.filter((p) => p.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.role_title.toLowerCase().includes(q) ||
          (p.company?.name ?? "").toLowerCase().includes(q) ||
          (p.location ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [initialProcesses, filter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of initialProcesses) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [initialProcesses]);

  return (
    <div className="flex-1 p-5 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Processes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track recruitment pipelines from application to offer
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="self-start sm:self-auto">
            <Plus className="h-4 w-4" />
            New Process
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.value === "all"
                ? initialProcesses.length
                : statusCounts[tab.value] ?? 0;
            if (tab.value !== "all" && count === 0) return null;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {tab.label}
                <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
          <div className="ml-auto w-full sm:w-auto">
            <Input
              placeholder="Search processes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full sm:w-48 text-sm"
            />
          </div>
        </div>

        {/* Process list */}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {initialProcesses.length === 0
                ? "No processes yet. Create your first one to start tracking a pipeline."
                : "No processes match your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/processes/${p.id}`}
                className="glass-card flex items-center gap-4 p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                {p.company && (
                  <CompanyLogo
                    name={p.company.name}
                    logoUrl={p.company.logo_url}
                    websiteDomain={p.company.website_domain}
                    size={36}
                    className="shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{p.role_title}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0",
                        STATUS_COLORS[p.status] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {p.company?.name ?? "—"}
                    </span>
                    {p.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {p.location}
                      </span>
                    )}
                    {p._count && (
                      <span>
                        {p._count.interactions} interaction{p._count.interactions !== 1 ? "s" : ""}
                      </span>
                    )}
                    {p.sourceProcess && (
                      <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                        <Link2 className="h-3 w-3" />
                        via {p.sourceProcess.company?.name ?? p.sourceProcess.role_title}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {formatDate(p.updated_at)}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <NewProcessDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companies={companies}
        allProcesses={allProcesses}
        preselectedCompanyId={preselectedCompanyId}
      />
    </div>
  );
}
