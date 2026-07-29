"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KanbanSquare,
  Home,
  Users,
  Handshake,
  MessageSquareText,
  CalendarDays,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth-actions";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/biens", label: "Biens", icon: Home },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/partenaires", label: "Partenaires", icon: Handshake },
  { href: "/templates", label: "Templates", icon: MessageSquareText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-navy-800 bg-navy-900 text-navy-100 lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent font-serif text-lg font-bold text-white">
          IS
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">L&apos;Immobilière</p>
          <p className="text-xs text-navy-300">de Saverne</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-navy-700 text-white"
                  : "text-navy-200 hover:bg-navy-800 hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-navy-800 px-6 py-4">
        <p className="text-xs font-medium text-white">Véronique Noureddine</p>
        <p className="text-[11px] text-navy-300">Mandataire · Réseau BSK</p>
        <form action={logout}>
          <button
            type="submit"
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-navy-300 transition-colors hover:text-white"
          >
            <LogOut className="h-3 w-3" />
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Barre de navigation mobile (haut d'écran). */
export function MobileTopbar() {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-navy-900 px-4 py-3 text-white lg:hidden">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold">
        IS
      </div>
      <span className="text-sm font-semibold">L&apos;Immobilière de Saverne</span>
    </div>
  );
}
