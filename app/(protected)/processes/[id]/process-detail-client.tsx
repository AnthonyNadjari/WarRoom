"use client";

import { useState, useEffect, type ComponentProps } from "react";
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
  CheckCircle2,
  Circle,
  StickyNote,
  ChevronDown,
  ChevronRight,
  X,
  Pencil,
} from "lucide-react";
import { updateProcess, deleteProcess } from "@/app/actions/processes";
import { createInteraction, getInteractionsForCompany, updateInteraction } from "@/app/actions/interactions";
import { createProcessNote, deleteProcessNote, updateProcessNote } from "@/app/actions/process-notes";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InteractionForm } from "@/components/interaction-form";
import { CompanyLogo } from "@/components/company-logo";
import { getFollowUpSeverity } from "@/lib/follow-up";
import { buildInteractionTree } from "@/lib/interaction-tree";
import type {
  ProcessWithRelations,
  ProcessStatus,
  InteractionWithRelations,
  InteractionType,
  InteractionGlobalCategory,
  InteractionStage,
  ProcessNote,
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

const STAGE_ORDER: (InteractionStage | "Ungrouped")[] = [
  "Application",
  "Screening",
  "Phone Interview",
  "Technical",
  "Final Round",
  "Offer Stage",
  "Other",
  "Ungrouped",
];

const STAGE_BORDER_COLORS: Record<string, string> = {
  Application: "border-l-blue-500",
  Screening: "border-l-cyan-500",
  "Phone Interview": "border-l-teal-500",
  Technical: "border-l-amber-500",
  "Final Round": "border-l-purple-500",
  "Offer Stage": "border-l-emerald-500",
  Other: "border-l-gray-400",
  Ungrouped: "border-l-gray-300 dark:border-l-gray-600",
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
type ContactSelect = { id: string; firstName: string | null; lastName: string | null; exactTitle?: string | null };

const INTERACTION_TYPES: InteractionType[] = [
  "Official Application",
  "LinkedIn Message",
  "Cold Email",
  "Call",
  "Referral",
];

const INTERACTION_STAGES: InteractionStage[] = [
  "Application",
  "Screening",
  "Phone Interview",
  "Technical",
  "Final Round",
  "Offer Stage",
  "Other",
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
  const [roleTitleManual, setRoleTitleManual] = useState(false);
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState("");
  const [saving, setSaving] = useState(false);

  // Autofill roleTitle from contact's exactTitle only when roleTitle is empty
  useEffect(() => {
    if (!contactId || roleTitleManual || roleTitle.trim() !== "") return;
    const contact = contacts.find((c) => c.id === contactId);
    if (contact?.exactTitle) setRoleTitle(contact.exactTitle);
  }, [contactId, contacts, roleTitleManual, roleTitle]);

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
        stage: (stage || null) as InteractionStage | null,
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
                {contacts.filter((c) => c.id != null && c.id !== "").map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {[c.firstName, c.lastName].filter(Boolean).join(" ") || "\u2014"}
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
              onChange={(e) => {
                setRoleTitle(e.target.value);
                setRoleTitleManual(true);
              }}
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
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

type AttachableInteraction = {
  id: string;
  role_title: string | null;
  type: string | null;
  date_sent: string | null;
  process_id: string | null;
  contact?: { first_name: string | null; last_name: string | null } | null;
};

function AttachExistingInteractionDialog({
  open,
  onOpenChange,
  processId,
  companyId,
  onAttached,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  processId: string;
  companyId: string;
  onAttached: () => void;
}) {
  const [list, setList] = useState<AttachableInteraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [attachingId, setAttachingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !companyId) return;
    setLoading(true);
    getInteractionsForCompany(companyId).then((data) => {
      const attachable = data.filter((i) => i.process_id !== processId);
      setList(attachable);
      setLoading(false);
    });
  }, [open, companyId, processId]);

  const handleAttach = async (interactionId: string) => {
    setAttachingId(interactionId);
    await updateInteraction(interactionId, { process_id: processId });
    setAttachingId(null);
    onAttached();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attach Existing Interaction</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-2 pt-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other interactions for this company to attach.
            </p>
          ) : (
            list.map((i) => {
              const name = i.contact
                ? [i.contact.first_name, i.contact.last_name].filter(Boolean).join(" ") || "\u2014"
                : "\u2014";
              return (
                <div
                  key={i.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <span className="font-medium">{i.role_title ?? "\u2014"}</span>
                    <span className="text-muted-foreground"> · {name}</span>
                    {i.date_sent && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {formatDate(i.date_sent)}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={!!attachingId}
                    onClick={() => handleAttach(i.id)}
                  >
                    {attachingId === i.id ? "Attaching..." : "Attach"}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProcessDetailClient({
  process,
  interactions: initialInteractions,
  childProcesses,
  allProcesses,
  companies,
  contacts,
  notes: initialNotes,
}: {
  process: ProcessWithRelations;
  interactions: InteractionWithRelations[];
  childProcesses: ChildProcess[];
  allProcesses: ProcessSelect[];
  companies: CompanySelect[];
  contacts: ContactSelect[];
  notes: ProcessNote[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(process.status);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [attachExistingOpen, setAttachExistingOpen] = useState(false);

  // Local state for optimistic updates
  const [localInteractions, setLocalInteractions] = useState(initialInteractions);
  const [localNotes, setLocalNotes] = useState(initialNotes);
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});
  const [pipelineView, setPipelineView] = useState<"stage" | "date">("date");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedInteraction, setSelectedInteraction] = useState<InteractionWithRelations | null>(null);

  // Note creation state
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [savingEditId, setSavingEditId] = useState<string | null>(null);

  // Sync from server on re-render (e.g. after router.refresh)
  useEffect(() => {
    setLocalInteractions(initialInteractions);
  }, [initialInteractions]);

  useEffect(() => {
    setLocalNotes(initialNotes);
  }, [initialNotes]);

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus as ProcessStatus);
    await updateProcess(process.id, { status: newStatus });
    router.refresh();
  };

  const handleDelete = async () => {
    await deleteProcess(process.id);
    router.push("/processes");
  };

  // Toggle completed status with optimistic update
  const handleToggleCompleted = async (interaction: InteractionWithRelations) => {
    const newCompleted = !interaction.completed;
    setTogglingId(interaction.id);

    // Optimistic update
    setLocalInteractions((prev) =>
      prev.map((i) => (i.id === interaction.id ? { ...i, completed: newCompleted } : i))
    );

    try {
      await updateInteraction(interaction.id, { completed: newCompleted });
    } catch {
      // Revert on failure
      setLocalInteractions((prev) =>
        prev.map((i) => (i.id === interaction.id ? { ...i, completed: !newCompleted } : i))
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Group interactions by stage
  const stageGroups = (() => {
    const groups: Record<string, InteractionWithRelations[]> = {};
    for (const stage of STAGE_ORDER) {
      groups[stage] = [];
    }
    for (const interaction of localInteractions) {
      const stage = interaction.stage ?? "Ungrouped";
      if (!groups[stage]) groups[stage] = [];
      groups[stage].push(interaction);
    }
    return groups;
  })();

  // Filter out empty stages
  const activeStages = STAGE_ORDER.filter((stage) => stageGroups[stage].length > 0);

  // Timeline order (by date) for "By date" view: tree order flattened so roots then children, sorted by date
  const timelineOrder = (() => {
    const sorted = [...localInteractions].sort((a, b) =>
      (a.date_sent ?? "").localeCompare(b.date_sent ?? "")
    );
    return buildInteractionTree(sorted);
  })();

  const toggleStage = (stage: string) => {
    setCollapsedStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
  };

  // Note handlers
  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;
    setSavingNote(true);
    try {
      const noteId = await createProcessNote({
        process_id: process.id,
        content: noteContent.trim(),
      });
      // Optimistic add
      setLocalNotes((prev) => [
        ...prev,
        {
          id: noteId,
          user_id: process.user_id,
          process_id: process.id,
          content: noteContent.trim(),
          created_at: new Date().toISOString(),
        },
      ]);
      setNoteContent("");
      setShowNoteInput(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    const prevNotes = localNotes;
    // Optimistic remove
    setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
    try {
      await deleteProcessNote(noteId);
    } catch {
      // Revert on failure
      setLocalNotes(prevNotes);
    } finally {
      setDeletingNoteId(null);
    }
  };

  const startEditNote = (note: ProcessNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  const handleUpdateNote = async (noteId: string) => {
    const content = editingContent.trim();
    if (!content) return;
    setSavingEditId(noteId);
    const prevNotes = localNotes;
    setLocalNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, content } : n))
    );
    setEditingNoteId(null);
    setEditingContent("");
    try {
      await updateProcessNote(noteId, content);
    } catch {
      setLocalNotes(prevNotes);
    } finally {
      setSavingEditId(null);
    }
  };

  return (
    <div className="flex-1 p-5 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" asChild className="mt-1 shrink-0">
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
                className="mt-0.5 shrink-0 hidden sm:block"
              />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">{process.role_title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
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
                <span className="hidden sm:inline">Created {formatDate(process.created_at)}</span>
              </div>
            </div>
          </div>
          {/* Actions row */}
          <div className="flex items-center gap-2 pl-11 sm:pl-0 sm:justify-end">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32 sm:w-36">
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
              {process.sourceProcess.company?.name ?? "\u2014"} — {process.sourceProcess.role_title}
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
                      <span className="font-medium">{cp.company?.name ?? "\u2014"}</span>
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

        {/* Pipeline Progress */}
        <div className="glass-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-semibold">Pipeline</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {localInteractions.length}
            </span>
            <div className="flex items-center gap-1 rounded-lg border p-0.5">
              <button
                type="button"
                onClick={() => setPipelineView("stage")}
                className={cn(
                  "rounded-md px-2 py-1 text-xs transition-colors",
                  pipelineView === "stage" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                By stage
              </button>
              <button
                type="button"
                onClick={() => setPipelineView("date")}
                className={cn(
                  "rounded-md px-2 py-1 text-xs transition-colors",
                  pipelineView === "date" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                By date
              </button>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => setAttachExistingOpen(true)}>
                Attach existing
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
          <div className="p-2">
            {localInteractions.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No interactions linked to this process yet.
              </p>
            ) : pipelineView === "date" ? (
              <div className="space-y-0.5">
                {timelineOrder.map(({ item: i, depth }) => {
                  const severity = getFollowUpSeverity(i);
                  const contact = i.contact;
                  const name = contact
                    ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
                    : "\u2014";
                  return (
                    <div
                      key={i.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all",
                        depth > 0 && "ml-6 border-l-2 border-l-muted",
                        severity === "red" && "bg-red-50 dark:bg-red-950/30",
                        severity === "orange" && "bg-amber-50 dark:bg-amber-950/30"
                      )}
                    >
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">
                        {i.date_sent ? formatDate(i.date_sent) : "\u2014"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleCompleted(i)}
                        disabled={togglingId === i.id}
                        className="shrink-0 transition-colors hover:scale-110"
                        title={i.completed ? "Mark as incomplete" : "Mark as complete"}
                      >
                        {i.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedInteraction(i)}
                        className="min-w-0 flex-1 text-left hover:underline decoration-muted-foreground/30 underline-offset-2"
                      >
                        {depth > 0 && <span className="text-muted-foreground mr-1">↳</span>}
                        <span className={cn("font-medium", i.completed && "line-through text-muted-foreground")}>
                          {i.type ?? "Interaction"}
                        </span>
                        <span className="text-muted-foreground"> · {name}</span>
                        {i.role_title && (
                          <span className="text-muted-foreground"> · {i.role_title}</span>
                        )}
                        {i.comment && (
                          <p
                            className="text-xs text-muted-foreground italic truncate max-w-md mt-0.5"
                            title={i.comment}
                          >
                            &ldquo;{i.comment}&rdquo;
                          </p>
                        )}
                      </button>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0",
                          i.status === "Interview"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                            : i.status === "Offer"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                              : i.status === "Rejected"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                : i.status === "Discussion"
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  : "bg-muted text-muted-foreground"
                        )}
                      >
                        {i.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                {activeStages.map((stage) => {
                  const isCollapsed = collapsedStages[stage] ?? false;
                  const stageInteractions = stageGroups[stage];
                  const completedCount = stageInteractions.filter((i) => i.completed).length;

                  return (
                    <div key={stage}>
                      {/* Stage header */}
                      <button
                        type="button"
                        onClick={() => toggleStage(stage)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50",
                          "border-l-2",
                          STAGE_BORDER_COLORS[stage] ?? "border-l-gray-300"
                        )}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {stage}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {completedCount}/{stageInteractions.length}
                        </span>
                      </button>

                      {/* Stage interactions (tree order: roots then children indented) */}
                      {!isCollapsed && (() => {
                        const tree = buildInteractionTree(stageInteractions);
                        return (
                        <div className="ml-4 space-y-0.5 pb-1">
                          {tree.map(({ item: i, depth }) => {
                            const severity = getFollowUpSeverity(i);
                            const contact = i.contact;
                            const name = contact
                              ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
                              : "\u2014";

                            return (
                              <div
                                key={i.id}
                                className={cn(
                                  "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all",
                                  depth > 0 && "ml-6 border-l-2 border-l-muted",
                                  severity === "red" && "bg-red-50 dark:bg-red-950/30",
                                  severity === "orange" && "bg-amber-50 dark:bg-amber-950/30"
                                )}
                              >
                                {/* Toggle completed button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleCompleted(i)}
                                  disabled={togglingId === i.id}
                                  className="shrink-0 transition-colors hover:scale-110"
                                  title={i.completed ? "Mark as incomplete" : "Mark as complete"}
                                >
                                  {i.completed ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                  )}
                                </button>

                                {/* Interaction details - click to open detail sheet */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedInteraction(i)}
                                  className="min-w-0 flex-1 text-left hover:underline decoration-muted-foreground/30 underline-offset-2"
                                >
                                  {depth > 0 && <span className="text-muted-foreground mr-1">↳</span>}
                                  <span className={cn("font-medium", i.completed && "line-through text-muted-foreground")}>
                                    {i.type ?? "Interaction"}
                                  </span>
                                  <span className="text-muted-foreground"> · {name}</span>
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    · {i.date_sent ? formatDate(i.date_sent) : "\u2014"}
                                  </span>
                                </button>

                                {/* Right-side badges */}
                                <div className="flex flex-wrap items-center gap-1 shrink-0">
                                  {i.source_type === "Via Recruiter" && i.recruiter && (
                                    <span className="hidden sm:inline-flex items-center rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                      via {i.recruiter.name}
                                    </span>
                                  )}
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                      i.status === "Interview"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                        : i.status === "Offer"
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                          : i.status === "Rejected"
                                            ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                                            : i.status === "Discussion"
                                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                              : "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {i.status}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {/* Show truncated comments for interactions that have them */}
                          {stageInteractions
                            .filter((i) => i.comment)
                            .map((i) => (
                              <div key={`comment-${i.id}`} className="ml-6 pl-2 pb-0.5">
                                <p
                                  className="text-xs text-muted-foreground italic truncate max-w-md"
                                  title={i.comment ?? undefined}
                                >
                                  &ldquo;{i.comment}&rdquo;
                                </p>
                              </div>
                            ))}
                        </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            ) }
          </div>
        </div>

        {/* Activity Log (Notes) */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <StickyNote className="h-4 w-4" />
            <span className="text-sm font-semibold">Notes</span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {localNotes.length}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowNoteInput(true)}
            >
              <Plus className="h-4 w-4" />
              Add Note
            </Button>
          </div>
          <div className="p-3 space-y-2">
            {/* Inline note input */}
            {showNoteInput && (
              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <textarea
                  className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  rows={3}
                  placeholder="Write a note..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSaveNote();
                    }
                    if (e.key === "Escape") {
                      setShowNoteInput(false);
                      setNoteContent("");
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Ctrl+Enter to save, Esc to cancel
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowNoteInput(false);
                        setNoteContent("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={!noteContent.trim() || savingNote}
                      onClick={handleSaveNote}
                    >
                      {savingNote ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {localNotes.length === 0 && !showNoteInput ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No notes yet. Add one to track your progress.
              </p>
            ) : (
              <ul className="space-y-1">
                {localNotes.map((note) => (
                  <li
                    key={note.id}
                    className="group flex items-start gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                  >
                    <StickyNote className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(note.created_at)}
                      </span>
                      {editingNoteId === note.id ? (
                        <div className="mt-1 space-y-2">
                          <textarea
                            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateNote(note.id)}
                              disabled={!editingContent.trim() || savingEditId === note.id}
                            >
                              {savingEditId === note.id ? "Saving…" : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditNote}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                      )}
                    </div>
                    {editingNoteId !== note.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditNote(note)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          title="Edit note"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={deletingNoteId === note.id}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          title="Delete note"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
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
      <AttachExistingInteractionDialog
        open={attachExistingOpen}
        onOpenChange={setAttachExistingOpen}
        processId={process.id}
        companyId={process.company_id}
        onAttached={() => router.refresh()}
      />

      <Sheet open={!!selectedInteraction} onOpenChange={(open) => !open && setSelectedInteraction(null)}>
        <SheetContent className="flex flex-col overflow-hidden">
          <div className="flex flex-1 min-h-0 flex-col overflow-y-auto gap-6 pb-6 pr-2">
            <SheetHeader className="space-y-2">
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
              <div className="pt-2">
                <InteractionForm
                  interaction={
                    {
                      ...selectedInteraction,
                      process: { id: process.id, role_title: process.role_title, status: process.status },
                    } as ComponentProps<typeof InteractionForm>["interaction"]
                  }
                  onSaved={() => {
                    setSelectedInteraction(null);
                    router.refresh();
                  }}
                  onClose={() => setSelectedInteraction(null)}
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
