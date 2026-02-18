"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Building2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyLogo } from "@/components/company-logo";
import type { Company } from "@/types/database";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  Bank: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Hedge Fund": "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "Asset Manager": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Private Equity": "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "Prop Shop": "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  Recruiter: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Other: "bg-muted text-muted-foreground",
};

export function CompaniesClient(props: {
  initialCompanies: Pick<Company, "id" | "name" | "type" | "main_location" | "website_domain" | "logo_url">[];
}) {
  const { initialCompanies } = props;
  const [search, setSearch] = useState("");

  const filtered = initialCompanies.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="flex flex-1 flex-col p-5 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {initialCompanies.length} company{initialCompanies.length !== 1 ? "ies" : "y"} tracked
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 pl-9"
            />
          </div>
          <Button size="sm" asChild>
            <Link href="/companies/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add company
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex-1">
        {filtered.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center p-12 text-center">
            <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {initialCompanies.length === 0
                ? "No companies yet. Add one to get started."
                : "No companies match your search."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={"/companies/" + c.id}
                className="glass-card group p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <CompanyLogo
                    name={c.name}
                    logoUrl={c.logo_url}
                    websiteDomain={c.website_domain}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                        {c.name}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.type === "Recruiter" && (
                          <span className="rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-2 py-0.5 text-[10px] font-semibold">
                            Headhunter
                          </span>
                        )}
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", TYPE_COLORS[c.type] || TYPE_COLORS.Other)}>
                          {c.type}
                        </span>
                      </div>
                    </div>
                    {c.main_location && (
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {c.main_location}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
