"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export async function updateDisplayName(name: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthenticated");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty.");

  await db.update(user).set({ name: trimmed }).where(eq(user.id, session.user.id));
}

export async function saveIdleMMOSettings(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const token = (formData.get("token") as string).trim();
  const characterId = (formData.get("characterId") as string).trim();

  await db
    .update(user)
    .set({
      idlemmoToken: token || null,
      idlemmoCharacterId: characterId || null,
    })
    .where(eq(user.id, session.user.id));
}
