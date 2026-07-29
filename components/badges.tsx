import type { ContactRole, PipelineStage } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  ROLE_BADGE,
  ROLE_LABELS,
  STAGE_COLORS,
  STAGE_LABELS,
} from "@/lib/labels";

export function StageBadge({
  stage,
  className,
}: {
  stage: PipelineStage;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STAGE_COLORS[stage],
        className
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function RoleBadge({ role }: { role: ContactRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        ROLE_BADGE[role]
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
