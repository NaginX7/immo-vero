import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SP = Record<string, string | string[] | undefined>;

/** Construit une liste de pages avec ellipses (ex: 1 … 4 5 6 … 20). */
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7)
    return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({
  basePath,
  searchParams,
  page,
  totalPages,
}: {
  basePath: string;
  searchParams: SP;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  function href(target: number) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (k === "page" || !v) return;
      params.set(k, Array.isArray(v) ? v[0] : v);
    });
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const items = pageWindow(page, totalPages);
  const btn =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors";

  return (
    <nav className="mt-6 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(btn, "hover:bg-muted")}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(btn, "cursor-not-allowed opacity-40")}>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {items.map((it, i) =>
        it === "…" ? (
          <span
            key={`gap-${i}`}
            className="px-2 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Link
            key={it}
            href={href(it)}
            className={cn(
              btn,
              it === page
                ? "border-navy-800 bg-navy-800 text-white"
                : "hover:bg-muted"
            )}
          >
            {it}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} className={cn(btn, "hover:bg-muted")}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(btn, "cursor-not-allowed opacity-40")}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
