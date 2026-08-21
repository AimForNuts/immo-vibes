import { and, count, eq, ilike, inArray, isNotNull, or } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { characters, user } from "@/lib/db/schema";

type D1Value = string | number | boolean | null;

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
};

type AuthUsersCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

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

function getAuthUsersD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as AuthUsersCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

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
  const d1 = getAuthUsersD1();
  const updatedAt = new Date();

  if (d1) {
    await d1
      .prepare(`UPDATE "user" SET name = ?, updated_at = ? WHERE id = ?`)
      .bind(name, updatedAt.toISOString(), userId)
      .run();
    return;
  }

  await db.update(user).set({ name, updatedAt }).where(eq(user.id, userId));
}

export async function updateIdleMMOSettings(input: {
  userId: string;
  token: string | null;
  characterId: string | null;
}) {
  const d1 = getAuthUsersD1();
  const updatedAt = new Date();

  if (d1) {
    await d1
      .prepare(
        `UPDATE "user"
         SET idlemmo_token = ?, idlemmo_character_id = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(input.token, input.characterId, updatedAt.toISOString(), input.userId)
      .run();
    return;
  }

  await db
    .update(user)
    .set({
      idlemmoToken: input.token,
      idlemmoCharacterId: input.characterId,
      updatedAt,
    })
    .where(eq(user.id, input.userId));
}

export async function getFirstAdminIdleMMOToken(): Promise<string | null> {
  const d1 = getAuthUsersD1();

  if (d1) {
    const row = await d1
      .prepare(
        `SELECT idlemmo_token
         FROM "user"
         WHERE role = 'admin' AND idlemmo_token IS NOT NULL
         LIMIT 1`
      )
      .first<{ idlemmo_token: string | null }>();

    return row?.idlemmo_token ?? null;
  }

  const adminRow = await db
    .select({ idlemmoToken: user.idlemmoToken })
    .from(user)
    .where(and(eq(user.role, "admin"), isNotNull(user.idlemmoToken)))
    .limit(1);

  return adminRow[0]?.idlemmoToken ?? null;
}

export async function getUserIdlemmoToken(userId: string): Promise<string | null> {
  const d1 = getAuthUsersD1();

  if (d1) {
    const row = await d1
      .prepare(`SELECT idlemmo_token FROM "user" WHERE id = ?`)
      .bind(userId)
      .first<{ idlemmo_token: string | null }>();

    return row?.idlemmo_token ?? null;
  }

  const rows = await db
    .select({ idlemmoToken: user.idlemmoToken })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return rows[0]?.idlemmoToken ?? null;
}

export async function getAdminUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
}): Promise<{ data: AdminUserRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, search, role } = params;
  const offset = (page - 1) * pageSize;
  const d1 = getAuthUsersD1();

  if (d1) {
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

  const conditions = [];
  if (search) conditions.push(or(
    ilike(user.email, `%${search}%`),
    ilike(user.username, `%${search}%`),
    ilike(user.name, `%${search}%`)
  ));
  if (role) conditions.push(eq(user.role, role));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [users, totals] = await Promise.all([
    db.select({
      id:        user.id,
      name:      user.name,
      email:     user.email,
      username:  user.username,
      role:      user.role,
      createdAt: user.createdAt,
    }).from(user).where(where).orderBy(user.createdAt).limit(pageSize).offset(offset),
    db.select({ value: count() }).from(user).where(where),
  ]);

  const userIds = users.map((u) => u.id);
  const chars = userIds.length > 0
    ? await db.select({
        userId:   characters.userId,
        id:       characters.id,
        hashedId: characters.hashedId,
        name:     characters.name,
        class:    characters.class,
      }).from(characters).where(inArray(characters.userId, userIds))
    : [];

  const charsByUser = new Map<string, typeof chars>();
  for (const c of chars) {
    const list = charsByUser.get(c.userId) ?? [];
    list.push(c);
    charsByUser.set(c.userId, list);
  }

  const data: AdminUserRow[] = users.map((u) => ({
    ...u,
    characters: (charsByUser.get(u.id) ?? []).map((c) => ({
      id: c.id, hashedId: c.hashedId, name: c.name, class: c.class,
    })),
  }));

  return { data, total: Number(totals[0].value), page, pageSize };
}

export async function updateUserEmail(userId: string, email: string) {
  const d1 = getAuthUsersD1();
  const updatedAt = new Date();

  if (d1) {
    await d1
      .prepare(`UPDATE "user" SET email = ?, updated_at = ? WHERE id = ?`)
      .bind(email, updatedAt.toISOString(), userId)
      .run();
    return;
  }

  await db.update(user)
    .set({ email, updatedAt })
    .where(eq(user.id, userId));
}

export async function deleteUser(userId: string) {
  const d1 = getAuthUsersD1();

  if (d1) {
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
    return;
  }

  await db.delete(user).where(eq(user.id, userId));
}

export async function dissociateCharacter(userId: string, characterId: number) {
  const d1 = getAuthUsersD1();

  if (d1) {
    await d1
      .prepare("DELETE FROM characters WHERE user_id = ? AND idlemmo_id = ?")
      .bind(userId, characterId)
      .run();
    return;
  }

  await db.delete(characters).where(
    and(eq(characters.id, characterId), eq(characters.userId, userId))
  );
}
