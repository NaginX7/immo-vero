"use client";

import { useState, useTransition } from "react";
import { Lock, Loader2, AlertCircle } from "lucide-react";

import { login } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ from }: { from?: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const res = await login(password, from);
      // En cas de succès, la server action redirige : on n'arrive pas ici.
      if (res && !res.ok) setError(res.error ?? "Connexion impossible.");
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl bg-white p-6 shadow-lg">
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs">
          Mot de passe
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
            placeholder="••••••••"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="mt-5 w-full"
        disabled={pending || password.length === 0}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Se connecter
      </Button>
    </form>
  );
}
