"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { SearchDialog } from "@/components/search/search-dialog";
import { ThemeProvider } from "@/hooks/use-theme";
import { SearchProvider } from "@/components/search/search-context";
import { cn } from "@/lib/utils";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <SearchProvider>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <div className="md:pl-56">
            <Header />
            <main
              className={cn(
                "min-h-[calc(100vh-3.5rem)] pb-20 md:pb-0",
                "flex flex-col"
              )}
            >
              {children}
            </main>
          </div>
          <MobileNav />
        </div>
        <SearchDialog />
      </SearchProvider>
    </ThemeProvider>
  );
}
