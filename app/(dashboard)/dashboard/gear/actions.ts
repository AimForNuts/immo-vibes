"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { gearPresets } from "@/lib/db/schema";

export type SlotMap = Record<string, { hashedId: string; tier: number }>;

export interface SavedPreset {
  id: string;
  name: string;
  weaponStyle: string;
  slots: SlotMap;
  characterId?: string;
}

export async function savePreset(data: {
  name: string;
  weaponStyle: string;
  slots: SlotMap;
  characterId?: string;
}): Promise<SavedPreset> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(gearPresets).values({
    id,
    userId: session.user.id,
    name: data.name,
    weaponStyle: data.weaponStyle,
    slots: data.slots,
    characterId: data.characterId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/dashboard/gear");

  return {
    id,
    name: data.name,
    weaponStyle: data.weaponStyle,
    slots: data.slots,
    characterId: data.characterId,
  };
}

export async function updatePreset(
  id: string,
  data: { weaponStyle: string; slots: SlotMap; characterId?: string }
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await db
    .update(gearPresets)
    .set({
      weaponStyle: data.weaponStyle,
      slots: data.slots,
      characterId: data.characterId ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(gearPresets.id, id), eq(gearPresets.userId, session.user.id)));

  revalidatePath("/dashboard/gear");
}

export async function deletePreset(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await db
    .delete(gearPresets)
    .where(and(eq(gearPresets.id, id), eq(gearPresets.userId, session.user.id)));

  revalidatePath("/dashboard/gear");
}
