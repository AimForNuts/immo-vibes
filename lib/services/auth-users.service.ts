import { getD1, type D1Value } from "@/lib/db/d1";

type AuthUserD1Row = {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  role: string;
  created_at: string;
  idlemmo_token?: string | null;
};

type CharacterD1Row = {
  user_id: string;
  hashed_id: string;
  idlemmo_id: number;
  name: string;
  class: string;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  role: string;
  createdAt: Date;
  characters: { id: number; hashedId: string; name: string; class: string }[];
};

function likeParam(value: string): string {
  return `%${value.toLowerCase()}%`;
}

function mapD1User(row: AuthUserD1Row): Omit<AdminUserRow, "characters"> {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    role: row.role,
    createdAt: new Date(row.created_at),
  };
}

export async function updateCurrentUserName(userId: string, name: string) {
  await getD1()
    .prepare(`UPDATE "user" SET name = ?, updated_at = ? WHERE id = ?`)
    .bind(name, new Date().toISOString(), userId)
    .run();
}

export async function updateIdleMMOSettings(input: {
  userId: string;
  token: string | null;
  characterId: string | null;
}) {
  await getD1()
    .prepare(
      `UPDATE "user"
       SET idlemmo_token = ?, idlemmo_character_id = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(input.token, input.characterId, new Date().toISOString(), input.userId)
    .run();
}

export async function getFirstAdminIdleMMOToken(): Promise<string | null> {
  const row = await getD1()
    .prepare(
      `SELECT idlemmo_token
       FROM "user"
       WHERE role = 'admin' AND idlemmo_token IS NOT NULL
       LIMIT 1`
    )
    .first<{ idlemmo_token: string | null }>();

  return row?.idlemmo_token ?? null;
}

export async function getUserIdlemmoToken(userId: string): Promise<string | null> {
  const row = await getD1()
    .prepare(`SELECT idlemmo_token FROM "user" WHERE id = ?`)
    .bind(userId)
    .first<{ idlemmo_token: string | null }>();

  return row?.idlemmo_token ?? null;
}

export async function getAdminUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
}): Promise<{ data: AdminUserRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, search, role } = params;
  const offset = (page - 1) * pageSize;
  const where: string[] = [];
  const values: D1Value[] = [];

  if (search) {
    where.push("(lower(email) LIKE ? OR lower(username) LIKE ? OR lower(name) LIKE ?)");
    values.push(likeParam(search), likeParam(search), likeParam(search));
  }

  if (role) {
    where.push("role = ?");
    values.push(role);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const d1 = getD1();
  const [{ results: users }, totalRow] = await Promise.all([
    d1
      .prepare(
        `SELECT id, name, email, username, role, created_at
         FROM "user"
         ${whereSql}
         ORDER BY created_at ASC
         LIMIT ? OFFSET ?`
      )
      .bind(...values, pageSize, offset)
      .all<AuthUserD1Row>(),
    d1
      .prepare(`SELECT count(*) AS value FROM "user" ${whereSql}`)
      .bind(...values)
      .first<{ value: number }>(),
  ]);

  const userIds = users.map((u) => u.id);
  const charactersByUser = new Map<string, CharacterD1Row[]>();

  if (userIds.length > 0) {
    const placeholders = userIds.map(() => "?").join(", ");
    const { results: chars } = await d1
      .prepare(
        `SELECT user_id, hashed_id, idlemmo_id, name, class
         FROM characters
         WHERE user_id IN (${placeholders})
         ORDER BY idlemmo_id ASC`
      )
      .bind(...userIds)
      .all<CharacterD1Row>();

    for (const c of chars) {
      const list = charactersByUser.get(c.user_id) ?? [];
      list.push(c);
      charactersByUser.set(c.user_id, list);
    }
  }

  return {
    data: users.map((row) => ({
      ...mapD1User(row),
      characters: (charactersByUser.get(row.id) ?? []).map((c) => ({
        id: c.idlemmo_id,
        hashedId: c.hashed_id,
        name: c.name,
        class: c.class,
      })),
    })),
    total: Number(totalRow?.value ?? 0),
    page,
    pageSize,
  };
}

export async function updateUserEmail(userId: string, email: string) {
  await getD1()
    .prepare(`UPDATE "user" SET email = ?, updated_at = ? WHERE id = ?`)
    .bind(email, new Date().toISOString(), userId)
    .run();
}

export async function deleteUser(userId: string) {
  const d1 = getD1();
  await d1.batch([
    d1.prepare("DELETE FROM session WHERE user_id = ?").bind(userId),
    d1.prepare("DELETE FROM account WHERE user_id = ?").bind(userId),
    d1.prepare("DELETE FROM price_tracker WHERE user_id = ?").bind(userId),
    d1.prepare("DELETE FROM gear_presets WHERE user_id = ?").bind(userId),
    d1.prepare("DELETE FROM character_pets WHERE user_id = ?").bind(userId),
    d1.prepare("DELETE FROM characters WHERE user_id = ?").bind(userId),
    d1.prepare("DELETE FROM user_preferences WHERE user_id = ?").bind(userId),
    d1.prepare(`DELETE FROM "user" WHERE id = ?`).bind(userId),
  ]);
}

export async function dissociateCharacter(userId: string, characterId: number) {
  await getD1()
    .prepare("DELETE FROM characters WHERE user_id = ? AND idlemmo_id = ?")
    .bind(userId, characterId)
    .run();
}
