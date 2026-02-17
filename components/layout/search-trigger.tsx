"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSearchOpen } from "@/components/search/search-context";

export function SearchTrigger({ className }: { className?: string }) {
  const open = useSearchOpen();

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-2 text-muted-foreground", className)}
      onClick={open}
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search (⌘K)</span>
    </Button>
  );
}
