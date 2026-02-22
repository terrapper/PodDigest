import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";
import { digestConfigUpdateSchema } from "@/lib/validators";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let config = await prisma.digestConfig.findFirst({
      where: { userId: session.user.id, isActive: true },
    });

    if (!config) {
      config = await prisma.digestConfig.create({
        data: { userId: session.user.id },
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Failed to get config:", error);
    return NextResponse.json(
      { error: "Failed to get digest config" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
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

  const parsed = digestConfigUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    let config = await prisma.digestConfig.findFirst({
      where: { userId: session.user.id, isActive: true },
    });

    if (!config) {
      config = await prisma.digestConfig.create({
        data: { userId: session.user.id, ...parsed.data },
      });
    } else {
      config = await prisma.digestConfig.update({
        where: { id: config.id },
        data: parsed.data,
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("Failed to update config:", error);
    return NextResponse.json(
      { error: "Failed to update digest config" },
      { status: 500 },
    );
  }
}
