"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Building2,
  MapPin,
  FolderKanban,
  Link2,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { updateProcess, deleteProcess } from "@/app/actions/processes";
import { createInteraction } from "@/app/actions/interactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CompanyLogo } from "@/components/company-logo";
import { getFollowUpSeverity } from "@/lib/follow-up";
import type {
  ProcessWithRelations,
  ProcessStatus,
  InteractionWithRelations,
  InteractionType,
  InteractionGlobalCategory,
} from "@/types/database";
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

type ChildProcess = {
  id: string;
  role_title: string;
  status: ProcessStatus;
  company: { id: string; name: string } | null;
};

type ProcessSelect = {
  id: string;
  role_title: string;
  status: string;
  company: { id: string; name: string } | null;
};

type CompanySelect = { id: string; name: string };
type ContactSelect = { id: string; firstName: string | null; lastName: string | null };

const INTERACTION_TYPES: InteractionType[] = [
  "Official Application",
  "LinkedIn Message",
  "Cold Email",
  "Call",
  "Referral",
];

const GLOBAL_CATEGORIES: InteractionGlobalCategory[] = [
  "Sales",
  "Trading",
  "Structuring",
  "Investment",
  "Other",
];

function AddInteractionDialog({
  open,
  onOpenChange,
  processId,
  companyId,
  contacts,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  processId: string;
  companyId: string;
  contacts: ContactSelect[];
}) {
  const router = useRouter();
  const [contactId, setContactId] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!contactId) return;
    setSaving(true);
    try {
      await createInteraction({
        company_id: companyId,
        contact_id: contactId,
        role_title: roleTitle.trim() || null,
        type: (type || null) as InteractionType | null,
        global_category: (category || null) as InteractionGlobalCategory | null,
        date_sent: new Date().toISOString().slice(0, 10),
        process_id: processId,
      });
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Interaction to Process</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Contact *</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger>
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {contacts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No contacts for this company.{" "}
                <Link
                  href={`/companies/${companyId}?tab=people`}
                  className="text-primary hover:underline"
                >
                  Add one first
                </Link>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Role Title</Label>
            <Input
              placeholder="e.g. Quant Analyst"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {INTERACTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {GLOBAL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full"
            disabled={!contactId || saving}
            onClick={handleSubmit}
          >
            {saving ? "Adding..." : "Add Interaction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProcessDetailClient({
  process,
  interactions,
  childProcesses,
  allProcesses,
  companies,
  contacts,
}: {
  process: ProcessWithRelations;
  interactions: InteractionWithRelations[];
  childProcesses: ChildProcess[];
  allProcesses: ProcessSelect[];
  companies: CompanySelect[];
  contacts: ContactSelect[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(process.status);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus as ProcessStatus);
    await updateProcess(process.id, { status: newStatus });
    router.refresh();
  };

  const handleDelete = async () => {
    await deleteProcess(process.id);
    router.push("/processes");
  };

  return (
    <div className="flex-1 p-5 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="mt-1">
            <Link href="/processes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          {process.company && (
            <CompanyLogo
              name={process.company.name}
              logoUrl={process.company.logo_url}
              websiteDomain={process.company.website_domain}
              size={44}
              className="mt-0.5 shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{process.role_title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {process.company && (
                <Link
                  href={`/companies/${process.company.id}`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {process.company.name}
                </Link>
              )}
              {process.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {process.location}
                </span>
              )}
              <span>Created {formatDate(process.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROCESS_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete process?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete the process and unlink all its interactions. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Source process link */}
        {process.sourceProcess && (
          <div className="glass-card flex items-center gap-3 p-3 text-sm">
            <Link2 className="h-4 w-4 text-violet-500 shrink-0" />
            <span className="text-muted-foreground">Introduced via</span>
            <Link
              href={`/processes/${process.sourceProcess.id}`}
              className="font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              {process.sourceProcess.company?.name ?? "—"} — {process.sourceProcess.role_title}
            </Link>
          </div>
        )}

        {/* Child processes */}
        {childProcesses.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="flex items-center gap-2 border-b bg-violet-50 px-4 py-2.5 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
              <FolderKanban className="h-4 w-4" />
              <span className="text-sm font-semibold">Linked Processes</span>
              <span className="ml-auto rounded-full bg-background/50 px-2 py-0.5 text-xs font-medium">
                {childProcesses.length}
              </span>
            </div>
            <ul className="divide-y">
              {childProcesses.map((cp) => (
                <li key={cp.id}>
                  <Link
                    href={`/processes/${cp.id}`}
                    className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-accent/50 transition-colors"
                  >
                    <span>
                      <span className="font-medium">{cp.company?.name ?? "—"}</span>
                      <span className="text-muted-foreground"> — {cp.role_title}</span>
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        STATUS_COLORS[cp.status] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      {cp.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Interactions timeline */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-semibold">Interactions</span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {interactions.length}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="p-2">
            {interactions.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No interactions linked to this process yet.
              </p>
            ) : (
              <ul className="space-y-0.5">
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
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-accent/50",
                          severity === "red" && "bg-red-50 dark:bg-red-950/30",
                          severity === "orange" && "bg-amber-50 dark:bg-amber-950/30"
                        )}
                      >
                        <div
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            severity === "red"
                              ? "bg-red-500"
                              : severity === "orange"
                                ? "bg-amber-500"
                                : "bg-blue-500"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{name}</span>
                          {i.type && (
                            <span className="text-muted-foreground"> · {i.type}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {i.source_type === "Via Recruiter" && i.recruiter && (
                            <span className="hidden sm:inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                              via {i.recruiter.name}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {i.date_sent ? formatDate(i.date_sent) : "—"}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              i.status === "Interview"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                : i.status === "Offer"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                  : i.status === "Rejected"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                    : "bg-muted text-muted-foreground"
                            )}
                          >
                            {i.status}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AddInteractionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        processId={process.id}
        companyId={process.company_id}
        contacts={contacts}
      />
    </div>
  );
}
