"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSearchContext } from "./search-context";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Building2, User, Mail, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchHit = {
  type: "company" | "contact" | "interaction";
  id: string;
  href: string;
  title: string;
  subtitle?: string;
};

export function SearchDialog() {
  const { open, setOpen } = useSearchContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim().toLowerCase();
      if (!trimmed) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const [companiesRes, contactsRes, interactionsRes] = await Promise.all([
          supabase
            .from("companies")
            .select("id, name")
            .ilike("name", `%${trimmed}%`)
            .limit(5),
          supabase
            .from("contacts")
            .select("id, first_name, last_name, email, exact_title, company_id")
            .or(
              `first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%,exact_title.ilike.%${trimmed}%`
            )
            .limit(10),
          supabase
            .from("interactions")
            .select("id, role_title, company_id, contact_id")
            .ilike("role_title", `%${trimmed}%`)
            .limit(5),
        ]);

        const hits: SearchHit[] = [];

        companiesRes.data?.forEach((c) => {
          hits.push({
            type: "company",
            id: c.id,
            href: `/companies/${c.id}`,
            title: c.name,
            subtitle: "Company",
          });
        });

        contactsRes.data?.forEach((c) => {
          const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Contact";
          hits.push({
            type: "contact",
            id: c.id,
            href: `/companies/${c.company_id}?tab=people`,
            title: name,
            subtitle: c.exact_title || c.email || undefined,
          });
        });

        interactionsRes.data?.forEach((i) => {
          hits.push({
            type: "interaction",
            id: i.id,
            href: `/interactions?highlight=${i.id}`,
            title: i.role_title || "Interaction",
            subtitle: "Interaction",
          });
        });

        setResults(hits);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 200);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showClose={true} className="max-w-xl gap-0 p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Input
            placeholder="Search companies, contacts, roles, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {loading && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results
            </div>
          )}
          {!loading && results.length > 0 && (
            <ul className="py-2">
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <Link
                    href={r.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent"
                    )}
                  >
                    {r.type === "company" && (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    )}
                    {r.type === "contact" && (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    {r.type === "interaction" && (
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.title}</div>
                      {r.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">
                          {r.subtitle}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
