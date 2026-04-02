import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateUserEmail, deleteUser } from "@/lib/services/admin/users.service";

async function requireAdmin(r: NextRequest) {
  const s = await auth.api.getSession({ headers: r.headers });
  return s?.user.role === "admin" ? s : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { email, newPassword } = await request.json() as { email?: string; newPassword?: string };

  if (email) {
    await updateUserEmail(id, email);
  }

  if (newPassword) {
    await auth.api.setUserPassword({
      body: { userId: id, newPassword },
      headers: request.headers,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await deleteUser(id);
  return new NextResponse(null, { status: 204 });
}
