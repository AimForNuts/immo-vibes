import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCharacterInfo, getAltCharacters, type CharacterDetail, type AltCharacter } from "@/lib/idlemmo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { STATUS_DOT_COLOR, STATUS_LABEL_KEY } from "@/lib/game-constants";

export default async function CharactersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const token = session.user.idlemmoToken;
  const charId = session.user.idlemmoCharacterId;

  if (!token || !charId) {
    return (
      <div className="max-w-lg space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Characters</h1>
        <p className="text-muted-foreground">
          Configure your IdleMMO API token and primary character ID in{" "}
          <a href="/dashboard/settings" className="underline underline-offset-4 text-foreground">
            Settings
          </a>
          .
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

  const all = [
    ...(primary ? [{ ...primary, isPrimary: true }] : []),
    ...alts.map((a) => ({ ...a, isPrimary: false, current_status: undefined as never })),
  ].slice(0, 5);

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Characters</h1>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {all.map((char) => (
            <Link key={char.hashed_id} href={`/dashboard/characters/${char.hashed_id}`}>
              <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4 px-4">
                  {/* Avatar */}
                  <div className="size-14 shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                    {char.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={char.image_url} alt={char.name} className="object-cover w-full h-full" />
                    ) : (
                      <User className="size-6 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{char.name}</p>
                      {char.isPrimary && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground capitalize mt-0.5">
                      {char.class.toLowerCase()}
                    </p>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-medium">Lv {char.total_level}</span>
                    {char.isPrimary && char.current_status && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={`size-2 rounded-full ${STATUS_DOT_COLOR[char.current_status] ?? "bg-zinc-500"}`} />
                        {STATUS_LABEL_KEY[char.current_status] ?? char.current_status}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
