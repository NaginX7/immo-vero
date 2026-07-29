"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PublicLink() {
  const [url, setUrl] = useState("/rdv");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/rdv`);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // presse-papier indisponible
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input readOnly value={url} className="max-w-md font-mono text-sm" />
      <Button variant={copied ? "default" : "outline"} onClick={copy}>
        {copied ? (
          <>
            <Check className="h-4 w-4" /> Copié
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" /> Copier le lien
          </>
        )}
      </Button>
      <Button variant="ghost" asChild>
        <a href="/rdv" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" /> Aperçu
        </a>
      </Button>
    </div>
  );
}
