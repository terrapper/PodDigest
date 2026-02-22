import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { subscribeSchema } from "@/lib/validators";

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

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { feedUrl, itunesId, title, author, artworkUrl, category, priority } =
    parsed.data;

  try {
    const podcast = await prisma.podcast.upsert({
      where: { feedUrl },
      create: {
        feedUrl,
        itunesId: itunesId ?? null,
        title,
        author: author ?? null,
        artworkUrl: artworkUrl ?? null,
        category: category ?? null,
      },
      update: {
        title,
        author: author ?? undefined,
        artworkUrl: artworkUrl ?? undefined,
        category: category ?? undefined,
        itunesId: itunesId ?? undefined,
      },
    });

    const subscription = await prisma.subscription.upsert({
      where: {
        userId_podcastId: {
          userId: session.user.id,
          podcastId: podcast.id,
        },
      },
      create: {
        userId: session.user.id,
        podcastId: podcast.id,
        priority,
        isActive: true,
      },
      update: {
        priority,
        isActive: true,
      },
      include: { podcast: true },
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error("Failed to subscribe:", error);
    return NextResponse.json(
      { error: "Failed to subscribe to podcast" },
      { status: 500 },
    );
  }
}
