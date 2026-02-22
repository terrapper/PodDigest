import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const digest = await prisma.digest.findFirst({
      where: { userId: session.user.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      include: {
        clips: {
          orderBy: { position: "asc" },
          include: {
            episode: {
              select: {
                id: true,
                title: true,
                audioUrl: true,
                publishedAt: true,
                podcast: {
                  select: {
                    id: true,
                    title: true,
                    author: true,
                    artworkUrl: true,
                  },
                },
              },
            },
          },
        },
        config: {
          select: {
            name: true,
            targetLength: true,
            narrationDepth: true,
            musicStyle: true,
            transitionStyle: true,
          },
        },
      },
    });

    if (!digest) {
      return NextResponse.json(
        { error: "No completed digests found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ digest });
  } catch (error) {
    console.error("Failed to get latest digest:", error);
    return NextResponse.json(
      { error: "Failed to get latest digest" },
      { status: 500 },
    );
  }
}
