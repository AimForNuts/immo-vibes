"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkAuthToken } from "@/lib/idlemmo";
import { updateCurrentUserName, updateIdleMMOSettings } from "@/lib/services/auth-users.service";

export async function updateDisplayName(name: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthenticated");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name cannot be empty.");

  await updateCurrentUserName(session.user.id, trimmed);
}

export async function saveIdleMMOSettings(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const token = (formData.get("token") as string).trim();

  if (!token) {
    // Clearing the token also clears the character
    await updateIdleMMOSettings({
      userId: session.user.id,
      token: null,
      characterId: null,
    });
    redirect("/dashboard/settings");
  }

  // Verify the token and fetch the primary character ID automatically
  const authResult = await checkAuthToken(token);
  if (!authResult.authenticated || !authResult.character) {
    throw new Error("Invalid API token — could not authenticate with IdleMMO.");
  }

  await updateIdleMMOSettings({
    userId: session.user.id,
    token,
    characterId: authResult.character.hashed_id,
  });

  redirect("/dashboard/settings");
}
