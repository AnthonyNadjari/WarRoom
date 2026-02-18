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
import { searchAll, type SearchHit } from "@/app/actions/search";
import Link from "next/link";
import { Building2, User, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchDialog() {
  const { open, setOpen } = useSearchContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const hits = await searchAll(q);
      setResults(hits);
    } finally {
      setLoading(false);
    }
  }, []);

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
                      <div className="truncate font-medium">{r.title}</div>
                      {r.subtitle && (
                        <div className="truncate text-xs text-muted-foreground">
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
