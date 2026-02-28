"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  updateInteraction,
  getRecruitersForSelect,
  getInteractionsForParentSelect,
} from "@/app/actions/interactions";
import { updateProcess, getProcessesForSelect } from "@/app/actions/processes";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";
import type {
  Interaction,
  InteractionStatus,
  InteractionSourceType,
  Priority,
  InteractionGlobalCategory,
  InteractionType,
  InteractionStage,
  Outcome,
} from "@/types/database";

type ProcessOption = { id: string; role_title: string; status: string; company: { id: string; name: string } | null };
type ParentOption = { id: string; role_title: string | null; type: string | null; date_sent: string | null; company: { name: string } | null };

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

const OUTCOME_OPTIONS: Outcome[] = ["None", "Rejected", "Interview", "Offer"];

const STAGE_OPTIONS: InteractionStage[] = [
  "Application",
  "Screening",
  "Phone Interview",
  "Technical",
  "Final Round",
  "Offer Stage",
  "Other",
];

const DEBOUNCE_MS = 500;

export function InteractionForm(props: {
  interaction: Interaction;
  onSaved?: () => void;
  onClose?: () => void;
}) {
  const { interaction, onSaved, onClose } = props;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [roleTitle, setRoleTitle] = useState(interaction.role_title ?? "");
  const [globalCategory, setGlobalCategory] = useState<InteractionGlobalCategory | "">(
    interaction.global_category ?? ""
  );
  const [type, setType] = useState<InteractionType | "">(interaction.type ?? "");
  const [status, setStatus] = useState<InteractionStatus>(interaction.status ?? "Sent");
  const [priority, setPriority] = useState<Priority | "">(interaction.priority ?? "");
  const [dateSent, setDateSent] = useState(interaction.date_sent ?? "");
  const [nextFollowUpDate, setNextFollowUpDate] = useState(
    interaction.next_follow_up_date ?? ""
  );
  const [outcome, setOutcome] = useState<Outcome | "">(interaction.outcome ?? "");
  const [comment, setComment] = useState(interaction.comment ?? "");
  const [stage, setStage] = useState<InteractionStage | "">(interaction.stage ?? "");
  const [completed, setCompleted] = useState(interaction.completed ?? false);
  const [sourceType, setSourceType] = useState<InteractionSourceType>(
    interaction.source_type ?? "Direct"
  );
  const [recruiterId, setRecruiterId] = useState(interaction.recruiter_id ?? "");
  const [recruiters, setRecruiters] = useState<{ id: string; name: string }[]>([]);
  const [processId, setProcessId] = useState(interaction.process_id ?? "");
  const [parentInteractionId, setParentInteractionId] = useState(interaction.parent_interaction_id ?? "");
  const [processOptions, setProcessOptions] = useState<ProcessOption[]>([]);
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [updatingProcessStatus, setUpdatingProcessStatus] = useState(false);

  useEffect(() => {
    if (sourceType === "Via Recruiter" && recruiters.length === 0) {
      getRecruitersForSelect().then(setRecruiters);
    }
  }, [sourceType, recruiters.length]);

  useEffect(() => {
    getProcessesForSelect().then((list) =>
      setProcessOptions(
        list.map((p) => ({
          id: p.id,
          role_title: p.role_title,
          status: p.status,
          company: p.company ? { id: p.company.id, name: p.company.name } : null,
        }))
      )
    );
  }, []);

  useEffect(() => {
    getInteractionsForParentSelect().then((list) =>
      setParentOptions(list.filter((p) => p.id !== interaction.id))
    );
  }, [interaction.id]);

  const save = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateInteraction(interaction.id, {
        role_title: roleTitle || null,
        global_category: globalCategory || null,
        type: type || null,
        status,
        priority: priority || null,
        date_sent: dateSent || null,
        next_follow_up_date: nextFollowUpDate || null,
        outcome: outcome || null,
        comment: comment || null,
        stage: stage || null,
        completed,
        source_type: sourceType,
        recruiter_id: sourceType === "Via Recruiter" ? (recruiterId || null) : null,
        process_id: processId.trim() || null,
        parent_interaction_id: parentInteractionId.trim() || null,
      });
      setDirty(false);
      setSaved(true);
      onSaved?.();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [
    interaction.id,
    roleTitle,
    globalCategory,
    type,
    status,
    priority,
    dateSent,
    nextFollowUpDate,
    outcome,
    comment,
    stage,
    completed,
    sourceType,
    recruiterId,
    processId,
    parentInteractionId,
    onSaved,
  ]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => save(), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [
    dirty,
    roleTitle,
    globalCategory,
    type,
    status,
    priority,
    dateSent,
    nextFollowUpDate,
    outcome,
    comment,
    stage,
    completed,
    sourceType,
    recruiterId,
    processId,
    parentInteractionId,
    save,
  ]);

  async function handleMarkProcessInterviewing() {
    const process = (interaction as Interaction & { process?: { id: string; status: string } }).process;
    if (!process?.id) return;
    setUpdatingProcessStatus(true);
    await updateProcess(process.id, { status: "Interviewing" });
    setUpdatingProcessStatus(false);
    onSaved?.();
  }

  const patch = useCallback(<T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setDirty(true);
  }, []);

  const interactionWithMeta = interaction as Interaction & {
    updated_at?: string;
    process?: { id: string; status: string };
    parentInteraction?: { id: string; role_title: string | null; type: string | null; date_sent: string | null; company?: { name: string } | null };
  };
  const showInterviewingSuggestion =
    status === "Interview" &&
    interactionWithMeta.process?.status === "Active";

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {showInterviewingSuggestion && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <span className="text-muted-foreground">Mark process as Interviewing?</span>{" "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-amber-700 dark:text-amber-400"
            disabled={updatingProcessStatus}
            onClick={handleMarkProcessInterviewing}
          >
            {updatingProcessStatus ? "Updating…" : "Yes"}
          </Button>
        </div>
      )}
      <div className="space-y-2">
        <Label>Role title</Label>
        <Input
          value={roleTitle}
          onChange={(e) => patch(setRoleTitle, e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status || "Sent"} onValueChange={(v) => patch(setStatus, v as InteractionStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground break-words max-w-full">
            For a call or chat with no clear next step (e.g. a colleague said they&apos;ll pass on your CV), choose <strong>Discussion</strong>.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority || "__none__"} onValueChange={(v) => patch(setPriority, (v === "__none__" ? "" : v) as Priority)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={globalCategory || "__none__"} onValueChange={(v) => patch(setGlobalCategory, (v === "__none__" ? "" : v) as InteractionGlobalCategory)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type || "__none__"} onValueChange={(v) => patch(setType, (v === "__none__" ? "" : v) as InteractionType)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Source</Label>
          <Select
            value={sourceType}
            onValueChange={(v) => {
              patch(setSourceType, v as InteractionSourceType);
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
            <Label>Recruiter</Label>
            <Select value={recruiterId || "__none__"} onValueChange={(v) => patch(setRecruiterId, v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select recruiter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {recruiters.filter((r) => r.id != null && r.id !== "").map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label>Date</Label>
        <DateInput value={dateSent} onChange={(v) => patch(setDateSent, v)} placeholder="JJ/MM/AAAA" />
      </div>
      <div className="space-y-2">
        <Label>Next follow-up date (optional)</Label>
        <DateInput value={nextFollowUpDate} onChange={(v) => patch(setNextFollowUpDate, v)} placeholder="JJ/MM/AAAA" />
      </div>
      <div className="space-y-2">
        <Label>Outcome</Label>
        <Select value={outcome || "__none__"} onValueChange={(v) => patch(setOutcome, (v === "__none__" ? "" : v) as Outcome)}>
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {OUTCOME_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Comment</Label>
        <textarea
          className="flex min-h-[100px] w-full max-w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
          value={comment}
          onChange={(e) => patch(setComment, e.target.value)}
          placeholder="Notes about this interaction..."
          rows={4}
        />
      </div>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <button
          type="button"
          role="switch"
          aria-checked={completed}
          onClick={() => patch(setCompleted, !completed)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${completed ? "bg-emerald-500" : "bg-muted"}`}
        >
          <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${completed ? "translate-x-4" : "translate-x-0"}`} />
        </button>
        <Label className="cursor-pointer" onClick={() => patch(setCompleted, !completed)}>
          {completed ? "Completed" : "Mark as completed"}
        </Label>
      </div>
      {processId && (
        <div className="space-y-2">
          <Label>Stage</Label>
          <Select value={stage || "__none__"} onValueChange={(v) => patch(setStage, (v === "__none__" ? "" : v) as InteractionStage)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {STAGE_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Attach to Process</Label>
        <Select value={processId || "__none__"} onValueChange={(v) => patch(setProcessId, v === "__none__" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {processOptions.filter((p) => p.id != null && p.id !== "").map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.company?.name ?? "—"} — {p.role_title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Related to (optional)</Label>
        <Select value={parentInteractionId || "__none__"} onValueChange={(v) => patch(setParentInteractionId, v === "__none__" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {parentOptions.filter((p) => p.id != null && p.id !== "").map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.company?.name ?? "—"} — {p.role_title ?? "—"} — {p.type ?? "—"} — {p.date_sent ? formatDate(p.date_sent) : "—"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground break-words max-w-full">
          Choose the interaction that <strong>led to this one</strong> (e.g. the recruiter call that introduced you). That one will appear <strong>above</strong> this one in the list.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved" : "Save"}
        </Button>
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </form>
  );
}
