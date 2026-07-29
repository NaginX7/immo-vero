"use client";

import { useTransition } from "react";
import type { PipelineStage } from "@prisma/client";

import { updateBienStage } from "@/lib/actions";
import { PIPELINE_ORDER, STAGE_LABELS } from "@/lib/labels";
import { NativeSelect } from "@/components/ui/native-select";

export function StageSelect({
  bienId,
  stage,
}: {
  bienId: string;
  stage: PipelineStage;
}) {
  const [pending, start] = useTransition();
  return (
    <NativeSelect
      className="h-9 w-auto"
      defaultValue={stage}
      disabled={pending}
      onChange={(e) =>
        start(() => updateBienStage(bienId, e.target.value as PipelineStage))
      }
    >
      {PIPELINE_ORDER.map((s) => (
        <option key={s} value={s}>
          {STAGE_LABELS[s]}
        </option>
      ))}
    </NativeSelect>
  );
}
