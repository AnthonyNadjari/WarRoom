"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type { Contact, ContactCategory, Seniority } from "@/types/database";
import { createContact, updateContact } from "@/app/actions/contacts";

const CATEGORY_OPTIONS: ContactCategory[] = [
  "Sales",
  "Trading",
  "Structuring",
  "Investment",
  "HR",
  "Recruiter",
  "Other",
];

const SENIORITY_OPTIONS: Seniority[] = [
  "Partner",
  "MD",
  "Director",
  "VP",
  "Associate",
  "Analyst",
  "HR",
  "Recruiter",
  "Other",
];

export function ContactForm(props: {
  companyId: string;
  contact?: Contact | null;
  managerOptions?: { id: string; name: string }[];
}) {
  const { companyId, contact, managerOptions = [] } = props;
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(contact?.first_name ?? "");
  const [lastName, setLastName] = useState(contact?.last_name ?? "");
  const [exactTitle, setExactTitle] = useState(contact?.exact_title ?? "");
  const [category, setCategory] = useState<ContactCategory | "">(
    contact?.category ?? ""
  );
  const [seniority, setSeniority] = useState<Seniority | "">(
    contact?.seniority ?? ""
  );
  const [location, setLocation] = useState(contact?.location ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedin_url ?? "");
  const [managerId, setManagerId] = useState(contact?.manager_id ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        first_name: firstName || null,
        last_name: lastName || null,
        exact_title: exactTitle || null,
        category: category || null,
        seniority: seniority || null,
        location: location || null,
        email: email || null,
        phone: phone || null,
        linkedin_url: linkedinUrl || null,
        manager_id: managerId || null,
        notes: notes || null,
      };
      if (contact) {
        await updateContact(contact.id, payload);
        router.refresh();
      } else {
        await createContact(payload);
        router.push("/companies/" + companyId + "?tab=people");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First name</Label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Last name</Label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Exact title</Label>
        <Input
          value={exactTitle}
          onChange={(e) => setExactTitle(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ContactCategory)}
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
          <Label>Seniority</Label>
          <Select
            value={seniority}
            onValueChange={(v) => setSeniority(v as Seniority)}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {SENIORITY_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Location</Label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>LinkedIn URL</Label>
        <Input
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
        />
      </div>
      {managerOptions.length > 0 && (
        <div className="space-y-2">
          <Label>Manager</Label>
          <Select value={managerId} onValueChange={setManagerId}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">—</SelectItem>
              {managerOptions.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
