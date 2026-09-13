"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
} from "lucide-react";

import { sendTemplateEmail } from "@/lib/actions";
import { BIEN_VARS, EVENT_VARS } from "@/lib/template-vars";
import { formatEuro, formatDateShort } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type EmailTemplateLite = {
  id: string;
  nom: string;
  objet: string | null;
  corps: string;
};

export type ContactLite = {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
};

export type BienContext = {
  id: string;
  titre: string;
  adresse: string | null;
  ville: string | null;
  prix: number | null;
};

export type EventContext = {
  id: string;
  type: string;
  titre: string;
  date: string; // ISO
  bienId: string | null;
};

function extractVars(text: string): string[] {
  const set = new Set<string>();
  Array.from(text.matchAll(/\{([^}]+)\}/g)).forEach((m) => set.add(m[1]));
  return Array.from(set);
}

function applyVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{([^}]+)\}/g, (whole, name) => {
    const val = vars[name];
    return val && val.trim() !== "" ? val : whole;
  });
}

export function SendEmailDialog({
  emailTemplates,
  contact,
  contactsForPicker,
  biens,
  events,
  defaultTemplateId,
  bienId,
  triggerLabel = "Envoyer un email",
  triggerVariant = "accent",
  triggerSize = "default",
}: {
  emailTemplates: EmailTemplateLite[];
  contact?: ContactLite;
  contactsForPicker?: ContactLite[];
  biens?: BienContext[];
  events?: EventContext[];
  defaultTemplateId?: string;
  bienId?: string;
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
}) {
  const biensList = useMemo(() => biens ?? [], [biens]);
  const eventsList = useMemo(() => events ?? [], [events]);

  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(
    defaultTemplateId ?? emailTemplates[0]?.id ?? ""
  );
  const [to, setTo] = useState(contact?.email ?? "");
  const [bienSel, setBienSel] = useState(biensList[0]?.id ?? "");
  const [eventSel, setEventSel] = useState(eventsList[0]?.id ?? "");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const selected = emailTemplates.find((t) => t.id === templateId);

  const varNames = useMemo(
    () =>
      selected ? extractVars(`${selected.objet ?? ""}\n${selected.corps}`) : [],
    [selected]
  );

  /** Valeur auto-remplie pour une variable, selon contact / bien / événement. */
  function autoValFor(
    name: string,
    bienId2: string,
    eventId2: string
  ): string {
    const n = name.toLowerCase();
    const bien = biensList.find((b) => b.id === bienId2);
    const ev = eventsList.find((e) => e.id === eventId2);
    if (contact) {
      if (n === "prénom" || n === "prenom") return contact.prenom ?? "";
      if (n === "nom") return contact.nom;
      if (n === "nom_complet")
        return `${contact.prenom ?? ""} ${contact.nom}`.trim();
    }
    if (bien) {
      if (n === "adresse_bien")
        return [bien.adresse, bien.ville].filter(Boolean).join(", ");
      if (n === "ville_bien") return bien.ville ?? "";
      if (n === "prix") return bien.prix != null ? formatEuro(bien.prix) : "";
      if (n === "nb_visites")
        return String(
          eventsList.filter((e) => e.type === "VISITE" && e.bienId === bien.id)
            .length
        );
    }
    if (ev) {
      if (n === "date_rdv") return formatDateShort(ev.date);
    }
    return "";
  }

  // (Ré)initialise variables + textes à l'ouverture et au changement de template.
  useEffect(() => {
    if (!open || !selected) return;
    const init: Record<string, string> = {};
    varNames.forEach((n) => {
      init[n] = autoValFor(n, bienSel, eventSel);
    });
    setVars(init);
    setSubject(applyVars(selected.objet ?? "", init));
    setBody(applyVars(selected.corps, init));
    setStatus("idle");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templateId]);

  function regenerate(next: Record<string, string>) {
    if (!selected) return;
    setVars(next);
    setSubject(applyVars(selected.objet ?? "", next));
    setBody(applyVars(selected.corps, next));
  }

  function setVar(name: string, value: string) {
    regenerate({ ...vars, [name]: value });
  }

  /** Re-remplit les variables dérivées quand on change le bien/événement lié. */
  function applyContext(nextBien: string, nextEvent: string) {
    const next = { ...vars };
    varNames.forEach((name) => {
      const n = name.toLowerCase();
      if (BIEN_VARS.includes(n) || EVENT_VARS.includes(n)) {
        next[name] = autoValFor(name, nextBien, nextEvent);
      }
    });
    regenerate(next);
  }

  const remaining = useMemo(
    () => extractVars(`${subject}\n${body}`),
    [subject, body]
  );
  const noEmail = !!contact && !contact.email;

  const needsBien = varNames.some((n) => BIEN_VARS.includes(n.toLowerCase()));
  const needsEvent = varNames.some((n) => EVENT_VARS.includes(n.toLowerCase()));

  function send() {
    start(async () => {
      const res = await sendTemplateEmail({
        to,
        subject,
        body,
        contactId: contact?.id,
        bienId: bienId ?? (bienSel || undefined),
        templateId,
      });
      if (res.ok) {
        setStatus("sent");
        setTimeout(() => {
          setOpen(false);
          setStatus("idle");
        }, 1400);
      } else {
        setStatus("error");
        setError(res.error ?? "Échec de l'envoi.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          <Send className="h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-coral-500" /> Envoyer un email
          </DialogTitle>
        </DialogHeader>

        {emailTemplates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun template email disponible.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Template</Label>
              <NativeSelect
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {emailTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Destinataire</Label>
              {contact ? (
                <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
                  {`${contact.prenom ?? ""} ${contact.nom}`.trim()}
                  {contact.email ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {contact.email}
                    </span>
                  ) : (
                    <span className="text-destructive">
                      {" "}
                      · aucune adresse email
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <Input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="destinataire@email.fr"
                    list="contacts-email-list"
                  />
                  {contactsForPicker && contactsForPicker.length > 0 && (
                    <datalist id="contacts-email-list">
                      {contactsForPicker
                        .filter((c) => c.email)
                        .map((c) => (
                          <option key={c.id} value={c.email ?? ""}>
                            {`${c.prenom ?? ""} ${c.nom}`.trim()}
                          </option>
                        ))}
                    </datalist>
                  )}
                </>
              )}
            </div>

            {/* Contexte : bien / rendez-vous liés → remplissage auto des variables */}
            {(needsBien && biensList.length > 0) ||
            (needsEvent && eventsList.length > 0) ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {needsBien && biensList.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bien concerné</Label>
                    <NativeSelect
                      value={bienSel}
                      onChange={(e) => {
                        setBienSel(e.target.value);
                        applyContext(e.target.value, eventSel);
                      }}
                    >
                      {biensList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.titre}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}
                {needsEvent && eventsList.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Rendez-vous</Label>
                    <NativeSelect
                      value={eventSel}
                      onChange={(e) => {
                        setEventSel(e.target.value);
                        applyContext(bienSel, e.target.value);
                      }}
                    >
                      {eventsList.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {formatDateShort(ev.date)} — {ev.titre}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}
              </div>
            ) : null}

            {/* Variables à compléter */}
            {varNames.length > 0 && (
              <div className="rounded-lg border border-powder-200 bg-powder-50/50 p-3">
                <Label className="text-xs font-semibold text-navy-700">
                  Variables
                </Label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {varNames.map((name) => {
                    const filled = (vars[name] ?? "").trim() !== "";
                    return (
                      <div key={name} className="space-y-1">
                        <Label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span className="rounded bg-powder-100 px-1 font-medium text-coral-600">
                            {`{${name}}`}
                          </span>
                          {!filled && (
                            <span className="text-amber-600">· à remplir</span>
                          )}
                        </Label>
                        <Input
                          value={vars[name] ?? ""}
                          onChange={(e) => setVar(name, e.target.value)}
                          className="h-9"
                          placeholder="…"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Objet</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-sans"
              />
            </div>

            {remaining.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  À compléter avant l&apos;envoi :{" "}
                  {remaining.map((r) => `{${r}}`).join(", ")}
                </span>
              </div>
            )}
            {status === "error" && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {status === "sent" && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Email envoyé et journalisé dans les échanges.
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={send}
                disabled={
                  pending ||
                  noEmail ||
                  (!contact && !to) ||
                  remaining.length > 0
                }
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Envoyer
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
