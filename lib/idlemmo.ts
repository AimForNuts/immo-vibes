const BASE = "https://api.idle-mmo.com";

async function apiFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "ImmoWebSuite/1.0",
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`IdleMMO API returned ${res.status}`);
  return res.json() as Promise<T>;
}

export interface CharacterDetail {
  id: number;
  hashed_id: string;
  name: string;
  class: string;
  image_url: string | null;
  background_url: string | null;
  skills: Record<string, { experience: number; level: number }>;
  stats: Record<string, { experience: number; level: number }>;
  gold: number;
  tokens: number;
  shards: number;
  total_level: number;
  location: { id: number; name: string };
  equipped_pet: { id: number; name: string; image_url: string | null; level: number } | null;
  guild: {
    id: number;
    tag: string;
    experience: number;
    level: number;
    position: string;
  } | null;
  current_status: "ONLINE" | "IDLING" | "OFFLINE";
  created_at: string;
}

export interface AltCharacter {
  id: number;
  hashed_id: string;
  name: string;
  class: string;
  image_url: string | null;
  background_url: string | null;
  total_level: number;
  created_at: string;
}

export async function getCharacterInfo(
  hashedId: string,
  token: string
): Promise<CharacterDetail> {
  const data = await apiFetch<{ character: CharacterDetail }>(
    `/v1/character/${hashedId}/information`,
    token
  );
  return data.character;
}

export async function getAltCharacters(
  hashedId: string,
  token: string
): Promise<AltCharacter[]> {
  const data = await apiFetch<{ characters: AltCharacter[] }>(
    `/v1/character/${hashedId}/characters`,
    token
  );
  return data.characters;
}
