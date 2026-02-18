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
import type { CompanyType } from "@/types/database";
import { createCompany, updateCompany } from "@/app/actions/companies";

const COMPANY_TYPES: CompanyType[] = [
  "Bank",
  "Hedge Fund",
  "Asset Manager",
  "Private Equity",
  "Prop Shop",
  "Recruiter",
  "Other",
];

type CompanyEdit = {
  id: string;
  name: string;
  type: CompanyType;
  main_location: string | null;
  website_domain: string | null;
  logo_url: string | null;
  notes: string | null;
};

export function CompanyForm({ company }: { company?: CompanyEdit }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(company?.name ?? "");
  const [type, setType] = useState<CompanyType>(company?.type ?? "Other");
  const [mainLocation, setMainLocation] = useState(company?.main_location ?? "");
  const [websiteDomain, setWebsiteDomain] = useState(company?.website_domain ?? "");
  const [logoUrl, setLogoUrl] = useState(company?.logo_url ?? "");
  const [notes, setNotes] = useState(company?.notes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (company) {
        await updateCompany(company.id, {
          name,
          type,
          main_location: mainLocation || null,
          website_domain: websiteDomain || null,
          logo_url: logoUrl || null,
          notes: notes || null,
        });
        router.push("/companies/" + company.id);
      } else {
        const created = await createCompany({
          name,
          type,
          main_location: mainLocation || null,
          website_domain: websiteDomain || null,
          logo_url: logoUrl || null,
          notes: notes || null,
        });
        if (created?.id) router.push("/companies/" + created.id);
      }
    } finally {
      setSaving(false);
    }
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
        <Label htmlFor="websiteDomain">Website domain</Label>
        <Input
          id="websiteDomain"
          value={websiteDomain}
          onChange={(e) => setWebsiteDomain(e.target.value)}
          placeholder="e.g. goldmansachs.com"
        />
        <p className="text-xs text-muted-foreground">
          Used for automatic logo. Leave empty to show initials.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="logoUrl">Logo URL (optional override)</Label>
        <Input
          id="logoUrl"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
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
          {saving ? "Saving..." : "Save"}
        </Button>
        {company && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/companies/" + company.id)}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
