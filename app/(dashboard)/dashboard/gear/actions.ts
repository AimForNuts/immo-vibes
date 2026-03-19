"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { gearPresets } from "@/lib/db/schema";

export type SlotMap = Record<string, { hashedId: string; tier: number }>;

export async function savePreset(data: {
  name: string;
  weaponStyle: string;
  slots: SlotMap;
  characterId?: string;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await db.insert(gearPresets).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    name: data.name,
    weaponStyle: data.weaponStyle,
    slots: data.slots,
    characterId: data.characterId ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

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
