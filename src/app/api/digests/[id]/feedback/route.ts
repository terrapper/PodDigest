import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { clipFeedbackSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: digestId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = clipFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { clipId, feedbackType } = parsed.data;

  try {
    const digest = await prisma.digest.findUnique({
      where: { id: digestId },
      select: { userId: true },
    });
    if (!digest || digest.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Digest not found" },
        { status: 404 },
      );
    }

    const clip = await prisma.digestClip.findUnique({
      where: { id: clipId },
    });
    if (!clip || clip.digestId !== digestId) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }

    const updated = await prisma.digestClip.update({
      where: { id: clipId },
      data: { feedbackType },
    });

    return NextResponse.json({ clip: updated });
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 },
    );
  }
}
