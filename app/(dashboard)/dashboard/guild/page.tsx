import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getIdleMmoApiKeyId } from "@/lib/idlemmo-rate-limit";
import GuildView from "./GuildView";

export default async function GuildPage({
  searchParams,
}: { searchParams: Promise<{ id?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { id } = await searchParams;
  const guildId = [4, 697, 161].includes(Number(id)) ? Number(id) : 4;
  const keyId = session.user.idlemmoToken
    ? await getIdleMmoApiKeyId(session.user.idlemmoToken)
    : null;
  return <GuildView key={`${keyId}:${guildId}`} keyId={keyId} guildId={guildId} />;
}
