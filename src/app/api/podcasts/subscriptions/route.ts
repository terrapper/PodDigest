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
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: session.user.id, isActive: true },
      include: {
        podcast: {
          select: {
            id: true,
            title: true,
            author: true,
            artworkUrl: true,
            feedUrl: true,
            category: true,
            lastCrawledAt: true,
          },
        },
      },
      orderBy: { addedAt: "desc" },
    });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("Failed to list subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to list subscriptions" },
      { status: 500 },
    );
  }
}
