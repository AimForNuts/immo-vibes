import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCharacterInfo, getAltCharacters, type CharacterDetail, type AltCharacter } from "@/lib/idlemmo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

type AnyCharacter =
  | (CharacterDetail & { _type: "primary" })
  | (AltCharacter & { _type: "alt" });

const statusColor: Record<string, string> = {
  ONLINE: "bg-green-500",
  IDLING: "bg-yellow-500",
  OFFLINE: "bg-zinc-500",
};

function CharacterCard({ char }: { char: AnyCharacter }) {
  const status = char._type === "primary" ? char.current_status : null;

  return (
    <Link href={`/dashboard/characters/${char.hashed_id}`}>
      <Card className="group hover:border-primary/50 transition-colors cursor-pointer h-full">
        {/* Background / Avatar area */}
        <div className="relative h-28 rounded-t-lg overflow-hidden bg-muted flex items-center justify-center">
          {char.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={char.image_url}
              alt={char.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="size-12 text-muted-foreground/40" />
          )}
          {status && (
            <span
              className={`absolute top-2 right-2 size-2.5 rounded-full ring-2 ring-background ${statusColor[status]}`}
              title={status}
            />
          )}
        </div>

        <CardContent className="pt-3 pb-4 px-4">
          <p className="font-semibold truncate">{char.name}</p>
          <div className="flex items-center justify-between mt-1">
            <Badge variant="outline" className="text-xs capitalize">
              {char.class.toLowerCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Lv {char.total_level}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const token = session.user.idlemmoToken;
  const charId = session.user.idlemmoCharacterId;

  if (!token || !charId) {
    return (
      <div className="max-w-lg space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Configure your IdleMMO API token and primary character ID in{" "}
          <a href="/dashboard/settings" className="underline underline-offset-4 text-foreground">
            Settings
          </a>{" "}
          to see your characters here.
        </p>
      </div>
    );
  }

  let primary: CharacterDetail | null = null;
  let alts: AltCharacter[] = [];
  let error: string | null = null;

  try {
    [primary, alts] = await Promise.all([
      getCharacterInfo(charId, token),
      getAltCharacters(charId, token),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load characters.";
  }

  const characters: AnyCharacter[] = [
    ...(primary ? [{ ...primary, _type: "primary" as const }] : []),
    ...alts.map((a) => ({ ...a, _type: "alt" as const })),
  ].slice(0, 5);

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {characters.map((char) => (
            <CharacterCard key={char.hashed_id} char={char} />
          ))}
        </div>
      )}
    </div>
  );
}
