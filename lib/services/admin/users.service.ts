import { db } from "@/lib/db";
import { user, characters } from "@/lib/db/schema";
import { ilike, eq, count, and, or, inArray } from "drizzle-orm";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string | null;
  username: string | null;
  role: string;
  createdAt: Date;
  characters: { id: number; hashedId: string; name: string; class: string }[];
};

export async function getAdminUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
}): Promise<{ data: AdminUserRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, search, role } = params;
  const offset = (page - 1) * pageSize;

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
  await db.update(user)
    .set({ email, updatedAt: new Date() })
    .where(eq(user.id, userId));
}

export async function deleteUser(userId: string) {
  // Characters cascade via FK on characters.userId
  await db.delete(user).where(eq(user.id, userId));
}

export async function dissociateCharacter(userId: string, characterId: number) {
  await db.delete(characters).where(
    and(eq(characters.id, characterId), eq(characters.userId, userId))
  );
}
