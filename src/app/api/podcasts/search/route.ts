import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/api/auth";
import { searchPodcasts } from "@/services/feed-crawler";
import { podcastSearchSchema } from "@/lib/validators";

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

  const parsed = podcastSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const results = await searchPodcasts(parsed.data.query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to search podcasts" },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const parsed = podcastSearchSchema.safeParse({ query });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const results = await searchPodcasts(parsed.data.query);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to search podcasts" },
      { status: 502 },
    );
  }
}
