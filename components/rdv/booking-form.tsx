"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  Clock,
  MailCheck,
  AlertCircle,
  Loader2,
  ChevronLeft,
} from "lucide-react";

import { bookSlot } from "@/lib/calendar-actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AddressInput,
  type AdresseChoisie,
} from "@/components/rdv/address-input";

export type PublicSlot = { debut: string; fin: string };

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function labelJour(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

function labelHeure(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function BookingForm({
  slots,
  dureeMin,
}: {
  slots: PublicSlot[];
  dureeMin: number;
}) {
  const days = useMemo(() => {
    const map = new Map<string, PublicSlot[]>();
    for (const s of slots) {
      const k = dayKey(s.debut);
      const list = map.get(k);
      if (list) list.push(s);
      else map.set(k, [s]);
    }
    return Array.from(map.entries());
  }, [slots]);

  const [selectedDay, setSelectedDay] = useState<string | null>(
    days[0]?.[0] ?? null
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [adresse, setAdresse] = useState<AdresseChoisie | null>(null);
  const [done, setDone] = useState<null | { when: string }>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const daySlots = days.find(([k]) => k === selectedDay)?.[1] ?? [];

  function submit(fd: FormData) {
    if (!selectedSlot) return;
    start(async () => {
      const res = await bookSlot({
        debutISO: selectedSlot,
        nom: String(fd.get("nom") ?? ""),
        prenom: String(fd.get("prenom") ?? ""),
        email: String(fd.get("email") ?? ""),
        telephone: String(fd.get("telephone") ?? ""),
        adresseBien: adresse?.label ?? "",
        villeBien: adresse?.ville ?? "",
        codePostalBien: adresse?.codePostal ?? "",
        message: String(fd.get("message") ?? ""),
      });
      if (res.ok) {
        setDone({ when: selectedSlot });
        setError("");
      } else {
        setError(res.error);
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <MailCheck className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold text-navy-800">
          J&apos;ai bien reçu votre demande de rendez-vous !
        </h2>
        <p className="mt-3 text-sm text-emerald-900">
          Veuillez nous confirmer votre présence en cliquant sur le mail que je
          viens de vous envoyer.
        </p>
        <p className="mt-4 inline-block rounded-md border border-emerald-200 bg-white px-3 py-1.5 text-sm">
          <span className="capitalize">{labelJour(done.when)}</span> à{" "}
          <strong>{labelHeure(done.when)}</strong>
        </p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-4 font-medium text-navy-800">
          Aucun créneau disponible pour le moment
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Merci de réessayer ultérieurement ou de nous contacter directement.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Choix du créneau */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold text-navy-800">
          <CalendarDays className="h-4 w-4 text-coral-500" />
          1. Choisissez une date
        </h2>

        <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {days.map(([key, list]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedDay(key);
                setSelectedSlot(null);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                selectedDay === key
                  ? "border-coral-300 bg-powder-50 font-medium text-navy-800"
                  : "border-border hover:bg-muted"
              )}
            >
              <span className="capitalize">{labelJour(list[0].debut)}</span>
              <span className="text-xs text-muted-foreground">
                {list.length} créneau{list.length > 1 ? "x" : ""}
              </span>
            </button>
          ))}
        </div>

        <h2 className="mt-5 flex items-center gap-2 font-semibold text-navy-800">
          <Clock className="h-4 w-4 text-coral-500" />
          2. Choisissez une heure
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Durée du rendez-vous : {dureeMin} minutes
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {daySlots.map((s) => (
            <button
              key={s.debut}
              onClick={() => setSelectedSlot(s.debut)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition-colors",
                selectedSlot === s.debut
                  ? "border-coral-400 bg-accent text-accent-foreground"
                  : "border-border hover:bg-muted"
              )}
            >
              {labelHeure(s.debut)}
            </button>
          ))}
        </div>
      </div>

      {/* Coordonnées */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-navy-800">3. Vos coordonnées</h2>

        {!selectedSlot ? (
          <p className="mt-4 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <ChevronLeft className="mr-1 inline h-4 w-4" />
            Sélectionnez d&apos;abord un créneau.
          </p>
        ) : (
          <>
            <p className="mt-2 rounded-lg border border-powder-200 bg-powder-50 px-3 py-2 text-sm">
              <span className="capitalize">{labelJour(selectedSlot)}</span> à{" "}
              <strong>{labelHeure(selectedSlot)}</strong>
            </p>

            <form action={submit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Prénom</Label>
                  <Input name="prenom" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nom *</Label>
                  <Input name="nom" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email *</Label>
                <Input name="email" type="email" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Téléphone</Label>
                <Input name="telephone" type="tel" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adresse-bien" className="text-xs">
                  Adresse du bien
                </Label>
                <AddressInput
                  id="adresse-bien"
                  value={adresse}
                  onChange={setAdresse}
                />
                <p className="text-xs text-muted-foreground">
                  Commencez à saisir l&apos;adresse : les suggestions
                  proviennent du référentiel national des adresses.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Message (facultatif)</Label>
                <Textarea name="message" rows={3} />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="accent"
                className="w-full"
                disabled={pending}
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Demander ce rendez-vous
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Vous recevrez un email pour confirmer votre présence.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
