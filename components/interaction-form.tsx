"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  updateInteraction,
  getRecruitersForSelect,
  getInteractionsForParentSelect,
} from "@/app/actions/interactions";
import { updateProcess, getProcessesForCompany } from "@/app/actions/processes";
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
import type {
  Interaction,
  InteractionStatus,
  InteractionSourceType,
  Priority,
  InteractionGlobalCategory,
  InteractionType,
  Outcome,
} from "@/types/database";

type ProcessOption = { id: string; role_title: string; status: string; company: { id: string; name: string } | null };
type ParentOption = { id: string; role_title: string | null; type: string | null; date_sent: string | null; company: { name: string } | null };

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

const TYPE_OPTIONS: InteractionType[] = [
  "Official Application",
  "LinkedIn Message",
  "Cold Email",
  "Call",
  "Referral",
];

const OUTCOME_OPTIONS: Outcome[] = ["None", "Rejected", "Interview", "Offer"];

const DEBOUNCE_MS = 500;

export function InteractionForm(props: {
  interaction: Interaction;
  onSaved?: () => void;
  onClose?: () => void;
}) {
  const { interaction, onSaved, onClose } = props;
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [roleTitle, setRoleTitle] = useState(interaction.role_title ?? "");
  const [globalCategory, setGlobalCategory] = useState<InteractionGlobalCategory | "">(
    interaction.global_category ?? ""
  );
  const [type, setType] = useState<InteractionType | "">(interaction.type ?? "");
  const [status, setStatus] = useState<InteractionStatus>(interaction.status);
  const [priority, setPriority] = useState<Priority | "">(interaction.priority ?? "");
  const [dateSent, setDateSent] = useState(interaction.date_sent ?? "");
  const [lastUpdate, setLastUpdate] = useState(interaction.last_update ?? "");
  const [nextFollowUpDate, setNextFollowUpDate] = useState(
    interaction.next_follow_up_date ?? ""
  );
  const [outcome, setOutcome] = useState<Outcome | "">(interaction.outcome ?? "");
  const [comment, setComment] = useState(interaction.comment ?? "");
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
    if (!interaction.company_id) return;
    getProcessesForCompany(interaction.company_id).then((list) =>
      setProcessOptions(
        list.map((p) => ({
          id: p.id,
          role_title: p.role_title,
          status: p.status,
          company: p.company ? { id: p.company.id, name: p.company.name } : null,
        }))
      )
    );
  }, [interaction.company_id]);

  useEffect(() => {
    getInteractionsForParentSelect().then((list) =>
      setParentOptions(list.filter((p) => p.id !== interaction.id))
    );
  }, [interaction.id]);

  const save = useCallback(async () => {
    setSaving(true);
    await updateInteraction(interaction.id, {
      role_title: roleTitle || null,
      global_category: globalCategory || null,
      type: type || null,
      status,
      priority: priority || null,
      date_sent: dateSent || null,
      last_update: lastUpdate || null,
      next_follow_up_date: nextFollowUpDate || null,
      outcome: outcome || null,
      comment: comment || null,
      source_type: sourceType,
      recruiter_id: sourceType === "Via Recruiter" ? (recruiterId || null) : null,
      process_id: processId.trim() || null,
      parent_interaction_id: parentInteractionId.trim() || null,
    });
    setSaving(false);
    setDirty(false);
    onSaved?.();
  }, [
    interaction.id,
    roleTitle,
    globalCategory,
    type,
    status,
    priority,
    dateSent,
    lastUpdate,
    nextFollowUpDate,
    outcome,
    comment,
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
    lastUpdate,
    nextFollowUpDate,
    outcome,
    comment,
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
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {interactionWithMeta.updated_at && (
        <p className="text-xs text-muted-foreground">
          Last updated: {formatDate(interactionWithMeta.updated_at)}
        </p>
      )}
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
          <Select value={status} onValueChange={(v) => patch(setStatus, v as InteractionStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => patch(setPriority, v as Priority)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
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
          <Select value={globalCategory} onValueChange={(v) => patch(setGlobalCategory, v as InteractionGlobalCategory)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => patch(setType, v as InteractionType)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
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
            <Select value={recruiterId} onValueChange={(v) => patch(setRecruiterId, v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select recruiter" />
              </SelectTrigger>
              <SelectContent>
                {recruiters.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date sent</Label>
          <Input
            type="date"
            value={dateSent}
            onChange={(e) => patch(setDateSent, e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Last update</Label>
          <Input
            type="date"
            value={lastUpdate}
            onChange={(e) => patch(setLastUpdate, e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Next follow-up date</Label>
        <Input
          type="date"
          value={nextFollowUpDate}
          onChange={(e) => patch(setNextFollowUpDate, e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Outcome</Label>
        <Select value={outcome} onValueChange={(v) => patch(setOutcome, v as Outcome)}>
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {OUTCOME_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Comment</Label>
        <Input
          value={comment}
          onChange={(e) => patch(setComment, e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Attach to Process</Label>
        <Select value={processId || "__none__"} onValueChange={(v) => patch(setProcessId, v === "__none__" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {processOptions.map((p) => (
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
            {parentOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.company?.name ?? "—"} — {p.role_title ?? "—"} — {p.type ?? "—"} — {p.date_sent ? formatDate(p.date_sent) : "—"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
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
