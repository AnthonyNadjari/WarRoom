"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Company } from "@/types/database";

export function CompaniesClient(props: {
  initialCompanies: Pick<Company, "id" | "name" | "type" | "main_location">[];
}) {
  const { initialCompanies } = props;
  const [search, setSearch] = useState("");

  const filtered = initialCompanies.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Companies</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button asChild>
            <Link href="/companies/new">
              <Plus className="h-4 w-4" />
              Add company
            </Link>
          </Button>
        </div>
      </div>
      <div className="mt-4 flex-1">
        {filtered.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {initialCompanies.length === 0
              ? "No companies yet. Add one to get started."
              : "No companies match your search."}
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link
                  href={"/companies/" + c.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent/50"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">
                    {c.type ?? "—"} {c.main_location ? " · " + c.main_location : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
