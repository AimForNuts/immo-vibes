import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dissociateCharacter } from "@/lib/services/admin/users.service";
import { invalidRequest, parsePositiveInteger } from "@/lib/validation/api";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; charId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, charId } = await params;
  const characterId = parsePositiveInteger(charId, "charId");
  if (!characterId.ok) return invalidRequest(characterId.message);

  await dissociateCharacter(id, characterId.data);
  return new NextResponse(null, { status: 204 });
}
