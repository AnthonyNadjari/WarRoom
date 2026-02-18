"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { SearchDialog } from "@/components/search/search-dialog";
import { ThemeProvider } from "@/hooks/use-theme";
import { SearchProvider } from "@/components/search/search-context";

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
          <div className="md:pl-60">
            <Header />
            <main className="min-h-[calc(100vh-4rem)] pb-20 md:pb-0">
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
