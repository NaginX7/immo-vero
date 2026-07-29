"use client";

import { useState, useTransition } from "react";
import type { PipelineStage } from "@prisma/client";

import { updateBienStage } from "@/lib/actions";
import { PIPELINE_ORDER, STAGE_LABELS } from "@/lib/labels";
import { NativeSelect } from "@/components/ui/native-select";
import {
  CompromisDialog,
  type NotaireLite,
} from "@/components/biens/compromis-dialog";

export function StageSelect({
  bienId,
  bienTitre,
  stage,
  notaires,
}: {
  bienId: string;
  bienTitre: string;
  stage: PipelineStage;
  notaires: NotaireLite[];
}) {
  const [pending, start] = useTransition();
  const [compromisOuvert, setCompromisOuvert] = useState(false);

  return (
    <>
      <NativeSelect
        className="h-9 w-auto"
        defaultValue={stage}
        disabled={pending}
        onChange={(e) => {
          const nouvelle = e.target.value as PipelineStage;
          start(async () => {
            await updateBienStage(bienId, nouvelle);
            // Passage en compromis : on demande aussitôt le ou les notaires.
            if (nouvelle === "COMPROMIS") setCompromisOuvert(true);
          });
        }}
      >
        {PIPELINE_ORDER.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </NativeSelect>

      <CompromisDialog
        open={compromisOuvert}
        onOpenChange={setCompromisOuvert}
        bienId={bienId}
        bienTitre={bienTitre}
        notaires={notaires}
      />
    </>
  );
}
