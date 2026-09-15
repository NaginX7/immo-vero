"use client";

import { useRef, useState, useTransition } from "react";
import {
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CalendarSync,
  Eye,
  EyeOff,
} from "lucide-react";
import type { ExternalCalendar } from "@prisma/client";

import {
  addExternalCalendar,
  deleteExternalCalendar,
  toggleExternalCalendar,
  regenerateIcsToken,
  syncExternalCalendars,
} from "@/lib/calendar-actions";
import { formatDateTime, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast } from "@/components/ui/toast";

export function SyncGoogle({
  icsUrl,
  agendas,
}: {
  icsUrl: string;
  agendas: ExternalCalendar[];
}) {
  const [url, setUrl] = useState(icsUrl);
  const [copie, setCopie] = useState(false);
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState("");
  const [erreur, setErreur] = useState("");
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function copier() {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 1800);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  function regenerer() {
    if (
      !window.confirm(
        "Régénérer le lien ? L'abonnement actuel cessera de fonctionner et devra être recréé dans Google Agenda."
      )
    )
      return;
    start(async () => {
      const nouveau = await regenerateIcsToken();
      setUrl(
        icsUrl.replace(/token=[^&]*/, `token=${encodeURIComponent(nouveau)}`)
      );
      setToast("Nouveau lien généré");
    });
  }

  function ajouter(fd: FormData) {
    setErreur("");
    start(async () => {
      const res = await addExternalCalendar(fd);
      if (res.ok) {
        formRef.current?.reset();
        setToast("Agenda ajouté — ses créneaux sont désormais bloqués");
      } else {
        setErreur(res.error ?? "Ajout impossible.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* ---- Export : abonnement depuis Google Agenda ---- */}
      <section>
        <h4 className="text-sm font-semibold text-navy-800">
          Vos rendez-vous dans Google Agenda
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Abonnez-vous à ce lien : chaque rendez-vous pris depuis votre page
          publique apparaîtra automatiquement dans votre agenda.
        </p>

        <div className="mt-3 flex gap-2">
          <Input
            readOnly
            value={visible ? url : url.replace(/token=.*/, "token=••••••••••")}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setVisible((v) => !v)}
            title={visible ? "Masquer le lien" : "Afficher le lien"}
          >
            {visible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button type="button" variant="outline" onClick={copier}>
            {copie ? (
              <>
                <Check className="h-4 w-4" /> Copié
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copier
              </>
            )}
          </Button>
        </div>

        <details className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
          <summary className="cursor-pointer text-xs font-medium text-navy-800">
            Comment l&apos;ajouter à Google Agenda ?
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>Ouvrez Google Agenda sur ordinateur.</li>
            <li>
              À gauche, à côté de « Autres agendas », cliquez sur{" "}
              <strong>+</strong> puis{" "}
              <strong>À partir de l&apos;URL</strong>.
            </li>
            <li>Collez le lien ci-dessus, puis « Ajouter un agenda ».</li>
            <li>
              Les rendez-vous apparaissent en quelques minutes. Google actualise
              ensuite le flux plusieurs fois par jour.
            </li>
          </ol>
          <p className="mt-2 text-xs text-amber-700">
            Ce lien donne accès à vos rendez-vous et aux coordonnées des
            clients : ne le partagez pas.
          </p>
        </details>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 text-xs text-muted-foreground"
          onClick={regenerer}
          disabled={pending}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Régénérer le lien
        </Button>
      </section>

      {/* ---- Import : agendas qui bloquent les créneaux ---- */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-navy-800">
              Agendas qui bloquent vos créneaux
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Les événements de ces agendas rendent les créneaux
              correspondants indisponibles à la réservation.
            </p>
          </div>
          {agendas.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await syncExternalCalendars();
                  setToast(`Synchronisé — ${r.total} occupation(s) lue(s)`);
                })
              }
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarSync className="h-4 w-4" />
              )}
              Actualiser
            </Button>
          )}
        </div>

        {agendas.length > 0 && (
          <ul className="mt-3 space-y-2">
            {agendas.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      !a.actif && "text-muted-foreground line-through"
                    )}
                  >
                    {a.nom}
                  </p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {a.url.replace(/\/[^/]*$/, "/…")}
                  </p>
                  {a.lastError ? (
                    <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                      {a.lastError}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.nbEvenements} occupation(s)
                      {a.lastSyncAt
                        ? ` · lu le ${formatDateTime(a.lastSyncAt)}`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await toggleExternalCalendar(a.id, !a.actif);
                        setToast(
                          a.actif ? "Agenda désactivé" : "Agenda réactivé"
                        );
                      })
                    }
                  >
                    {a.actif ? "Désactiver" : "Activer"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-red-50 hover:text-destructive"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Retirer « ${a.nom} » ?`))
                        start(async () => {
                          await deleteExternalCalendar(a.id);
                          setToast("Agenda retiré");
                        });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form ref={formRef} action={ajouter} className="mt-3 space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <div className="space-y-1">
              <Label className="text-xs">Nom</Label>
              <Input name="nom" placeholder="Agenda personnel" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Adresse secrète au format iCal</Label>
              <Input
                name="url"
                required
                placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline" disabled={pending}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Ajouter
              </Button>
            </div>
          </div>

          {erreur && (
            <p className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {erreur}
            </p>
          )}
        </form>

        <details className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
          <summary className="cursor-pointer text-xs font-medium text-navy-800">
            Où trouver cette adresse dans Google Agenda ?
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>Google Agenda → paramètres (roue dentée) → Paramètres.</li>
            <li>
              Dans la colonne de gauche, cliquez sur l&apos;agenda concerné.
            </li>
            <li>
              Section <strong>Intégrer l&apos;agenda</strong> → copiez
              l&apos;<strong>adresse secrète au format iCal</strong>.
            </li>
            <li>Collez-la ci-dessus.</li>
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">
            Google met son flux à jour avec un léger différé : un événement
            tout juste créé peut mettre quelques minutes à bloquer le créneau.
          </p>
        </details>
      </section>

      <Toast show={!!toast} message={toast} onDone={() => setToast("")} />
    </div>
  );
}
