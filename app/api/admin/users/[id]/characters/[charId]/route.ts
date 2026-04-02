import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dissociateCharacter } from "@/lib/services/admin/users.service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; charId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, charId } = await params;
  await dissociateCharacter(id, Number(charId));
  return new NextResponse(null, { status: 204 });
}
