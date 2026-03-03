"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompanyType } from "@/types/database";

type CompanyOption = {
  id: string;
  name: string;
  type: CompanyType;
  main_location: string | null;
  website_domain: string | null;
  logo_url: string | null;
};

export function NewContactClient(props: { companies: CompanyOption[] }) {
  const { companies } = props;
  const [companyId, setCompanyId] = useState("");
  const router = useRouter();

  function handleContinue() {
    if (companyId) router.push("/companies/" + companyId + "/contacts/new");
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label>Company</Label>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a company" />
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
      <Button onClick={handleContinue} disabled={!companyId}>
        Continue
      </Button>
    </div>
  );
}
