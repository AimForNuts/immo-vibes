import { idleMmoQueue } from "@/lib/idlemmo-queue";
import type { GuildActivityEntry, GuildActivityResponse, GuildMembersResponse } from "@/lib/idlemmo";

export interface GuildSnapshot {
  members: GuildMembersResponse | null;
  activity: GuildActivityEntry[];
  nextPage: number | null;
  updatedAt: number;
}

const snapshots = new Map<string, GuildSnapshot>();
const FRESH_MS = 60_000;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asset(value: unknown) {
  return value === null || (record(value) && typeof value.name === "string" &&
    (value.image_url === null || typeof value.image_url === "string"));
}

function isEntry(value: unknown): value is GuildActivityEntry {
  return record(value) && Number.isSafeInteger(value.id) && typeof value.type === "string" &&
    record(value.character) && typeof value.character.name === "string" &&
    typeof value.character.hashed_id === "string" && typeof value.text === "string" &&
    typeof value.created_ago === "string" &&
    (value.value === null || (typeof value.value === "number" && Number.isFinite(value.value))) &&
    asset(value.item) && asset(value.guild_item);
}

export function parseGuildResponse(value: unknown, guildId: number, resource: "members" | "activity", page = 1) {
  if (!record(value) || !record(value.guild) || value.guild.id !== guildId || typeof value.guild.name !== "string") {
    throw new Error("Invalid guild response.");
  }
  if (resource === "members") {
    if (!Number.isSafeInteger(value.guild.member_count) || !Array.isArray(value.members) ||
        !value.members.every((member: unknown) => record(member) && typeof member.name === "string" &&
          typeof member.position === "string" && typeof member.total_level === "number" &&
          Number.isFinite(member.total_level) &&
          (member.hashed_id === undefined || typeof member.hashed_id === "string") &&
          (member.avatar_url === null || typeof member.avatar_url === "string"))) {
      throw new Error("Invalid guild members response.");
    }
    return value as unknown as GuildMembersResponse;
  }
  if (!Array.isArray(value.activity) || !value.activity.every(isEntry) || !record(value.pagination) ||
      value.pagination.current_page !== page || typeof value.pagination.has_more !== "boolean" ||
      (value.pagination.has_more && (!Number.isSafeInteger(value.pagination.next_page) ||
        Number(value.pagination.next_page) <= page))) {
    throw new Error("Invalid guild activity pagination response.");
  }
  return value as unknown as GuildActivityResponse;
}

export function getGuildSnapshot(keyId: string, guildId: number): GuildSnapshot {
  return snapshots.get(`${keyId}:${guildId}`) ?? { members: null, activity: [], nextPage: 1, updatedAt: 0 };
}

export async function loadGuildActivity(
  keyId: string,
  guildId: number,
  scope: string,
  signal: AbortSignal,
  onUpdate: (snapshot: GuildSnapshot) => void
) {
  let snapshot = getGuildSnapshot(keyId, guildId);
  const assertActive = () => {
    if (signal.aborted || idleMmoQueue.getStatus().keyId !== keyId) {
      throw new DOMException("Guild view cancelled", "AbortError");
    }
  };
  const publish = () => {
    assertActive();
    snapshots.set(`${keyId}:${guildId}`, snapshot);
    onUpdate(snapshot);
  };
  const request = async (resource: "members" | "activity", page = 1) => {
    assertActive();
    const response = await idleMmoQueue.fetch(`/api/idlemmo/guild/${guildId}/${resource}?page=${page}`, scope);
    assertActive();
    const value: unknown = await response.json();
    assertActive();
    if (!response.ok) throw new Error(record(value) && typeof value.error === "string" ? value.error :
      record(value) && typeof value.message === "string" ? value.message : "Guild data could not be refreshed.");
    return parseGuildResponse(value, guildId, resource, page);
  };

  publish();
  if (snapshot.nextPage === null && Date.now() - snapshot.updatedAt < FRESH_MS) return;
  const restarting = snapshot.nextPage === null;
  if (restarting || !snapshot.members) {
    snapshot = { ...snapshot, members: await request("members") as GuildMembersResponse,
      nextPage: restarting ? 1 : snapshot.nextPage };
    publish();
  }
  while (snapshot.nextPage !== null) {
    const page = snapshot.nextPage;
    const data = await request("activity", page) as GuildActivityResponse;
    const entries = new Map((page === 1 ? [] : snapshot.activity).map((entry) => [entry.id, entry]));
    for (const entry of data.activity) entries.set(entry.id, entry);
    snapshot = { ...snapshot, activity: [...entries.values()],
      nextPage: data.pagination.has_more ? data.pagination.next_page : null,
      updatedAt: Date.now() };
    publish();
  }
}
