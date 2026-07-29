"use client";

import { usePathname } from "next/navigation";

import { Sidebar, MobileTopbar } from "@/components/layout/sidebar";

/** Préfixes de routes publiques : affichées sans la navigation interne. */
const PUBLIC_PREFIXES = ["/rdv", "/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isPublic) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <MobileTopbar />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </>
  );
}
