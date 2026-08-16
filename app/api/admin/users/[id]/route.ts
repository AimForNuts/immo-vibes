import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateUserEmail, deleteUser } from "@/lib/services/admin/users.service";
import { invalidRequest, parseStringField, readJsonObject } from "@/lib/validation/api";

async function requireAdmin(r: NextRequest) {
  const s = await auth.api.getSession({ headers: r.headers });
  return s?.user.role === "admin" ? s : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await readJsonObject(request);
  if (!body.ok) return invalidRequest(body.message);

  const email = parseStringField(body.data, "email");
  if (!email.ok) return invalidRequest(email.message);

  const newPassword = parseStringField(body.data, "newPassword", { minLength: 8 });
  if (!newPassword.ok) return invalidRequest(newPassword.message);

  try {
    if (email.data) {
      await updateUserEmail(id, email.data);
    }

    if (newPassword.data) {
      await auth.api.setUserPassword({
        body: { userId: id, newPassword: newPassword.data },
        headers: request.headers,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await deleteUser(id);
  return new NextResponse(null, { status: 204 });
}
