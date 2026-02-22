import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { paginationSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = paginationSchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  try {
    const [digests, total] = await Promise.all([
      prisma.digest.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          weekStart: true,
          weekEnd: true,
          audioUrl: true,
          totalDuration: true,
          clipCount: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.digest.count({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({
      digests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to list digests:", error);
    return NextResponse.json(
      { error: "Failed to list digests" },
      { status: 500 },
    );
  }
}
