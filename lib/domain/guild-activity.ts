import type { GuildActivityEntry, GuildMember } from "@/lib/idlemmo";

export const GUILD_ACTIVITY_GROUPS = [
  { type: "CHALLENGE_CONTRIBUTION", label: "Challenge Contributions" },
  { type: "DEPOSITED_STOCKPILE", label: "Stockpile Deposits" },
  { type: "USED_ARMOURY_ITEM", label: "Armoury Items Used" },
] as const;

export type GuildActivityGroupType = (typeof GUILD_ACTIVITY_GROUPS)[number]["type"];

export type GroupedGuildActivity = {
  type: GuildActivityGroupType;
  label: string;
  entries: GuildActivityEntry[];
  total: number;
};

export type MemberWithActivity = GuildMember & {
  activity: GuildActivityEntry[];
  activityTotal: number;
  activityGroups: GroupedGuildActivity[];
};

const TRACKED_ACTIVITY_TYPES = new Set<string>(
  GUILD_ACTIVITY_GROUPS.map((group) => group.type)
);

function memberActivityKey(member: GuildMember) {
  return member.hashed_id ?? member.name.toLowerCase();
}

function activityCharacterKey(activity: GuildActivityEntry) {
  return activity.character.hashed_id || activity.character.name.toLowerCase();
}

export function attachActivityToMembers(
  members: GuildMember[],
  activity: GuildActivityEntry[]
): MemberWithActivity[] {
  const activityByCharacter = new Map<string, GuildActivityEntry[]>();

  for (const entry of activity) {
    if (!TRACKED_ACTIVITY_TYPES.has(entry.type)) continue;

    const key = activityCharacterKey(entry);
    const entries = activityByCharacter.get(key) ?? [];
    entries.push(entry);
    activityByCharacter.set(key, entries);
  }

  return members.map((member) => {
    const entries = activityByCharacter.get(memberActivityKey(member)) ?? [];
    const activityTotal = entries.reduce((total, entry) => total + (entry.value ?? 0), 0);
    const activityGroups = GUILD_ACTIVITY_GROUPS.map((group) => {
      const groupEntries = entries.filter((entry) => entry.type === group.type);

      return {
        ...group,
        entries: groupEntries,
        total: groupEntries.reduce((total, entry) => total + (entry.value ?? 0), 0),
      };
    });

    return {
      ...member,
      activity: entries,
      activityTotal,
      activityGroups,
    };
  });
}
