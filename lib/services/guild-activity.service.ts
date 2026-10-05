import { getGuildActivity, type GuildActivityEntry, type GuildActivityResult, type GuildRateLimitState } from "@/lib/idlemmo";

export async function getAllGuildActivity(guildId: number, token: string): Promise<GuildActivityResult> {
  const rateLimit: GuildRateLimitState = { remaining: null, resetAt: 0 };
  const entries = new Map<number, GuildActivityEntry>();
  let page = 1;

  while (true) {
    const result = await getGuildActivity(guildId, token, page, rateLimit);
    if (!result.ok) return result;
    const { activity, pagination } = result.data;
    if (!Array.isArray(activity) || !pagination ||
        pagination.current_page !== page || typeof pagination.has_more !== "boolean" ||
        (pagination.has_more && (!Number.isInteger(pagination.next_page) || pagination.next_page! <= page))) {
      return { ok: false, status: 502, message: "Invalid guild activity pagination response." };
    }
    for (const entry of activity) entries.set(entry.id, entry);
    if (!pagination.has_more) {
      return { ok: true, data: { ...result.data, activity: [...entries.values()] } };
    }
    page = pagination.next_page!;
  }
}
