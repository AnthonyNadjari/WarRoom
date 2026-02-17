"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import type { CompanyType } from "@/types/database";

const COMPANY_TYPES: CompanyType[] = [
  "Bank",
  "Hedge Fund",
  "Asset Manager",
  "Recruiter Firm",
  "Other",
];

type CompanyEdit = { id: string; name: string; type: CompanyType; main_location: string | null; notes: string | null };

export function CompanyForm({ company }: { company?: CompanyEdit }) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(company?.name ?? "");
  const [type, setType] = useState<CompanyType>(company?.type ?? "Other");
  const [mainLocation, setMainLocation] = useState(company?.main_location ?? "");
  const [notes, setNotes] = useState(company?.notes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    if (company) {
      await supabase
        .from("companies")
        .update({ name, type, main_location: mainLocation || null, notes: notes || null })
        .eq("id", company.id);
      router.push("/companies/" + company.id);
    } else {
      const { data } = await supabase
        .from("companies")
        .insert({ user_id: user.id, name, type, main_location: mainLocation || null, notes: notes || null })
        .select("id")
        .single();
      if (data) router.push(`/companies/${data.id}`);
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as CompanyType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPANY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Main location</Label>
        <Input
          id="location"
          value={mainLocation}
          onChange={(e) => setMainLocation(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {company && (
          <Button type="button" variant="outline" onClick={() => router.push(`/companies/${company.id}`)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
