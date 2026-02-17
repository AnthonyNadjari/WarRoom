"use client";

import * as React from "react";

type SearchContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  openSearch: () => void;
};

const SearchContext = React.createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const openSearch = React.useCallback(() => setOpen(true), []);

  const value = React.useMemo(
    () => ({ open, setOpen, openSearch }),
    [open]
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearchOpen() {
  const ctx = React.useContext(SearchContext);
  if (!ctx) throw new Error("useSearchOpen must be used within SearchProvider");
  return ctx.openSearch;
}

export function useSearchContext() {
  const ctx = React.useContext(SearchContext);
  if (!ctx) throw new Error("useSearchContext must be used within SearchProvider");
  return ctx;
}
