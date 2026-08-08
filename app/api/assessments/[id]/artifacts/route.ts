import { NextResponse } from "next/server";
import { PRODUCT_LIMITS } from "@/lib/config";
import { validateArtifactSet } from "@/lib/upload";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formData = await request.formData();
  const entries = formData.getAll("files");
  const files = entries.filter((entry): entry is File => entry instanceof File);

  if (entries.length !== files.length) {
    return NextResponse.json({ error: "Only file uploads are accepted." }, { status: 400 });
  }

  const validation = validateArtifactSet(files);
  if (!validation.accepted) {
    return NextResponse.json({ assessmentId: id, ...validation }, { status: 400 });
  }

  return NextResponse.json(
    {
      assessmentId: id,
      accepted: true,
      storageMode: "validation-only",
      limits: { maxFiles: PRODUCT_LIMITS.maxFiles, maxFileBytes: PRODUCT_LIMITS.maxFileBytes },
      artifacts: validation.artifacts.map(({ name, size, type }) => ({ name, size, type, status: "validated" }))
    },
    { status: 200 }
  );
}
