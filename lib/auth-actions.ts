"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  COOKIE_NAME,
  SESSION_DAYS,
  createSessionValue,
  signingSecret,
} from "@/lib/auth";

export type LoginResult = { ok: boolean; error?: string };

/** Vérifie le mot de passe global et ouvre une session. */
export async function login(
  password: string,
  from?: string
): Promise<LoginResult> {
  const attendu = process.env.APP_PASSWORD;

  if (!attendu) {
    return {
      ok: false,
      error:
        "Aucun mot de passe n'est configuré sur le serveur (variable APP_PASSWORD).",
    };
  }

  // Comparaison à temps constant (évite de révéler le mot de passe par timing)
  const a = password ?? "";
  let diff = a.length === attendu.length ? 0 : 1;
  for (let i = 0; i < Math.max(a.length, attendu.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (attendu.charCodeAt(i) || 0);
  }
  if (diff !== 0) {
    return { ok: false, error: "Mot de passe incorrect." };
  }

  cookies().set({
    name: COOKIE_NAME,
    value: await createSessionValue(signingSecret()),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  redirect(from && from.startsWith("/") ? from : "/");
}

export async function logout() {
  cookies().delete(COOKIE_NAME);
  redirect("/login");
}
