"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Notification flottante éphémère (bas de l'écran).
 * Contrôlée par `show` ; se masque toute seule après `duration`.
 */
export function Toast({
  show,
  message,
  variant = "success",
  duration = 2600,
  onDone,
}: {
  show: boolean;
  message: string;
  variant?: "success" | "error";
  duration?: number;
  onDone?: () => void;
}) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    if (!show) return;
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, duration]);

  if (!visible) return null;

  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium shadow-lg",
        "duration-200 animate-in fade-in slide-in-from-bottom-4",
        variant === "success"
          ? "bg-navy-800 text-white"
          : "bg-destructive text-destructive-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          variant === "success" ? "text-emerald-400" : "text-white"
        )}
      />
      {message}
    </div>
  );
}
