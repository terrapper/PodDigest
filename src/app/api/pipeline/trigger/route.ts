import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { generateDigestSchema } from "@/lib/validators";
import { pipelineQueue } from "@/lib/queue";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateDigestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { configId } = parsed.data;

  try {
    const config = await prisma.digestConfig.findUnique({
      where: { id: configId },
    });
    if (!config || config.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Digest config not found" },
        { status: 404 },
      );
    }

    const pendingDigest = await prisma.digest.findFirst({
      where: {
        userId: session.user.id,
        status: { notIn: ["COMPLETED", "FAILED"] },
      },
    });
    if (pendingDigest) {
      return NextResponse.json(
        {
          error: "A digest is already being generated",
          digestId: pendingDigest.id,
        },
        { status: 409 },
      );
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const digest = await prisma.digest.create({
      data: {
        userId: session.user.id,
        configId,
        title: `Weekly Digest — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        weekStart,
        weekEnd: now,
        status: "PENDING",
      },
    });

    await pipelineQueue.add(
      {
        digestId: digest.id,
        userId: session.user.id,
        configId,
      },
      { jobId: `digest-${digest.id}` },
    );

    return NextResponse.json({ digest }, { status: 202 });
  } catch (error) {
    console.error("Failed to trigger pipeline:", error);
    return NextResponse.json(
      { error: "Failed to trigger digest generation" },
      { status: 500 },
    );
  }
}
