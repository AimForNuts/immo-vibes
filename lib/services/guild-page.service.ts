import { forwardIdleMmoRateLimitHeaders, rateLimitedIdleMmoFetch } from "@/lib/idlemmo-rate-limit";

export async function fetchGuildPage(
  guildId: number,
  resource: "members" | "activity",
  page: number,
  token: string,
  signal: AbortSignal
) {
  const query = resource === "activity" ? `?page=${page}` : "";
  const upstream = await rateLimitedIdleMmoFetch(token,
    `https://api.idle-mmo.com/v1/guild/${guildId}/${resource}${query}`, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" },
      cache: "no-store",
      signal,
    });
  const response = new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
  forwardIdleMmoRateLimitHeaders(upstream, response);
  return response;
}
