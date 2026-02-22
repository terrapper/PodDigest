import { NextResponse } from "next/server";
import { searchPodcasts } from "@/services/feed-crawler";
import { podcastSearchSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const parsed = podcastSearchSchema.safeParse({ query });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search query" }, { status: 400 });
  }

  const results = await searchPodcasts(parsed.data.query);
  return NextResponse.json({ results });
}
