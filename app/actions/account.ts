"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { checkAuthToken } from "@/lib/idlemmo";

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

  if (!token) {
    // Clearing the token also clears the character
    await db
      .update(user)
      .set({ idlemmoToken: null, idlemmoCharacterId: null })
      .where(eq(user.id, session.user.id));
    redirect("/dashboard/settings");
  }

  // Verify the token and fetch the primary character ID automatically
  const authResult = await checkAuthToken(token);
  if (!authResult.authenticated || !authResult.character) {
    throw new Error("Invalid API token — could not authenticate with IdleMMO.");
  }

  await db
    .update(user)
    .set({
      idlemmoToken:       token,
      idlemmoCharacterId: authResult.character.hashed_id,
    })
    .where(eq(user.id, session.user.id));

  redirect("/dashboard/settings");
}
