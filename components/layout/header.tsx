"use client";

import { ThemeToggle } from "./theme-toggle";
import { SearchTrigger } from "./search-trigger";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/80 px-6 backdrop-blur-sm">
      <div className="hidden md:block">
        <SearchTrigger />
      </div>
      <div className="flex items-center gap-2">
        <SearchTrigger className="md:hidden" />
        <ThemeToggle />
      </div>
    </header>
  );
}
