"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  createGearPreset,
  deleteGearPreset,
  updateGearPreset,
  type GearPresetSlotMap,
} from "@/lib/services/gear-presets.service";

export type SlotMap = GearPresetSlotMap;

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

  const preset = await createGearPreset({
    userId: session.user.id,
    name: data.name,
    weaponStyle: data.weaponStyle,
    slots: data.slots,
    characterId: data.characterId,
  });

  revalidatePath("/dashboard/gear");

  return {
    id: preset.id,
    name: preset.name,
    weaponStyle: preset.weaponStyle,
    slots: preset.slots,
    characterId: preset.characterId ?? undefined,
  };
}

export async function updatePreset(
  id: string,
  data: { weaponStyle: string; slots: SlotMap; characterId?: string }
): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await updateGearPreset({
    id,
    userId: session.user.id,
    weaponStyle: data.weaponStyle,
    slots: data.slots,
    characterId: data.characterId,
  });

  revalidatePath("/dashboard/gear");
}

export async function deletePreset(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await deleteGearPreset({ id, userId: session.user.id });

  revalidatePath("/dashboard/gear");
}
