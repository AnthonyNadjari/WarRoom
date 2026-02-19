"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageSquare,
  FolderKanban,
  Settings,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/interactions", label: "Interactions", icon: MessageSquare },
  { href: "/processes", label: "Processes", icon: FolderKanban },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 bg-[hsl(230,25%,12%)] md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Crosshair className="h-4 w-4 text-white" />
        </div>
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          WarRoom
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 pt-2">
        {nav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs text-slate-500">Strategic CRM</p>
      </div>
    </aside>
  );
}
