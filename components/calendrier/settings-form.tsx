"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { CalendarSettings } from "@prisma/client";

import { updateCalendarSettings } from "@/lib/calendar-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Toast } from "@/components/ui/toast";

export function SettingsForm({ settings }: { settings: CalendarSettings }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <>
      <form
        action={(fd) =>
          start(async () => {
            await updateCalendarSettings(fd);
            setSaved(true);
          })
        }
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label className="text-xs">Durée d&apos;un RDV (min)</Label>
          <Input
            name="dureeCreneauMin"
            type="number"
            min={5}
            step={5}
            defaultValue={settings.dureeCreneauMin}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Battement entre 2 RDV (min)</Label>
          <Input
            name="pauseMin"
            type="number"
            min={0}
            step={5}
            defaultValue={settings.pauseMin}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Préavis minimum (heures)</Label>
          <Input
            name="preavisHeures"
            type="number"
            min={0}
            defaultValue={settings.preavisHeures}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Réservable jusqu&apos;à (jours)</Label>
          <Input
            name="horizonJours"
            type="number"
            min={1}
            defaultValue={settings.horizonJours}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Titre de la page publique</Label>
          <Textarea
            name="titrePublic"
            rows={2}
            defaultValue={settings.titrePublic}
          />
          <p className="text-[11px] text-muted-foreground">
            Appuyez sur Entrée pour passer un mot à la ligne.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Message d&apos;accueil</Label>
          <Textarea
            name="messagePublic"
            rows={3}
            defaultValue={settings.messagePublic ?? ""}
            placeholder="Choisissez le créneau qui vous convient…"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="actif" defaultChecked={settings.actif} />
          Réservations ouvertes
        </label>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
      </form>

      <Toast
        show={saved}
        message="Paramétrages enregistrés"
        onDone={() => setSaved(false)}
      />
    </>
  );
}
