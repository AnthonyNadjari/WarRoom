"use client";

import { ThemeToggle } from "./theme-toggle";
import { SearchTrigger } from "./search-trigger";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b bg-background px-4 md:justify-between">
      <div className="hidden md:block">
        <SearchTrigger />
      </div>
      <div className="flex items-center gap-1">
        <SearchTrigger className="md:hidden" />
        <ThemeToggle />
      </div>
    </header>
  );
}
