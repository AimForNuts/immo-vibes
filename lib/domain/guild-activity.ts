import type { GuildActivityEntry, GuildMember } from "@/lib/idlemmo";

export type MemberWithActivity = GuildMember & {
  activity: GuildActivityEntry[];
  activityTotal: number;
};

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
    const key = activityCharacterKey(entry);
    const entries = activityByCharacter.get(key) ?? [];
    entries.push(entry);
    activityByCharacter.set(key, entries);
  }

  return members.map((member) => {
    const entries = activityByCharacter.get(memberActivityKey(member)) ?? [];
    const activityTotal = entries.reduce((total, entry) => total + (entry.value ?? 0), 0);

    return {
      ...member,
      activity: entries,
      activityTotal,
    };
  });
}
