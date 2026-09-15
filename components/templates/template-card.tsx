"use client";

import { useState } from "react";
import { Copy, Check, Mail, MessageSquare } from "lucide-react";
import type { Template } from "@prisma/client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SendEmailDialog,
  type EmailTemplateLite,
  type ContactLite,
  type BienContext,
} from "@/components/email/send-email-dialog";
import { TemplateEditorDialog } from "@/components/templates/template-editor-dialog";

/** Découpe le texte en segments texte / variables {…} pour la coloration. */
function renderWithVars(text: string) {
  return text.split(/(\{[^}]+\})/g).map((part, i) =>
    part.startsWith("{") && part.endsWith("}") ? (
      <span
        key={i}
        className="rounded bg-powder-100 px-1 font-medium text-coral-600"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function TemplateCard({
  template,
  emailTemplates,
  contacts,
  biens,
}: {
  template: Template;
  emailTemplates: EmailTemplateLite[];
  contacts: ContactLite[];
  biens: BienContext[];
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text =
      template.canal === "EMAIL" && template.objet
        ? `Objet : ${template.objet}\n\n${template.corps}`
        : template.corps;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard indisponible — silencieux
    }
  }

  const isEmail = template.canal === "EMAIL";

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <Badge
              variant={isEmail ? "secondary" : "muted"}
              className="gap-1"
            >
              {isEmail ? (
                <Mail className="h-3 w-3" />
              ) : (
                <MessageSquare className="h-3 w-3" />
              )}
              {template.canal}
            </Badge>
            {template.tutoiement && (
              <Badge variant="accent">Tutoiement</Badge>
            )}
          </div>
          <h3 className="font-semibold leading-tight text-navy-800">
            {template.nom}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant={copied ? "default" : "outline"}
            onClick={copy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copié
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copier
              </>
            )}
          </Button>
          <TemplateEditorDialog template={template} />
          {isEmail && (
            <SendEmailDialog
              emailTemplates={emailTemplates}
              contactsForPicker={contacts}
              biens={biens}
              defaultTemplateId={template.id}
              triggerLabel="Envoyer"
              triggerVariant="accent"
              triggerSize="sm"
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {isEmail && template.objet && (
          <p className="mb-2 text-sm">
            <span className="text-muted-foreground">Objet : </span>
            {renderWithVars(template.objet)}
          </p>
        )}
        <div
          className={cn(
            "whitespace-pre-wrap rounded-md bg-muted/60 p-3 text-sm leading-relaxed [overflow-wrap:anywhere]"
          )}
        >
          {renderWithVars(template.corps)}
        </div>
      </CardContent>
    </Card>
  );
}
