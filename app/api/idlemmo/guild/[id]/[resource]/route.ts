import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { fetchGuildPage } from "@/lib/services/guild-page.service";

export async function GET(request: NextRequest,
  { params }: { params: Promise<{ id: string; resource: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const token = session.user.idlemmoToken;
  if (!token) return Response.json({ error: "No API token" }, { status: 400 });
  const { id, resource } = await params;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  if (![4, 697, 161].includes(Number(id)) ||
      (resource !== "members" && resource !== "activity") ||
      !Number.isSafeInteger(page) || page < 1) {
    return Response.json({ error: "Invalid guild request" }, { status: 400 });
  }
  try {
    return await fetchGuildPage(Number(id), resource, page, token, request.signal);
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("Guild request failed", error);
    return Response.json({ error: "Guild data could not be refreshed." }, { status: 502 });
  }
}
