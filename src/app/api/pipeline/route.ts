import { NextResponse } from "next/server";
// TODO: Pipeline monitoring endpoint

export async function GET() {
  return NextResponse.json({ status: "idle", jobs: [] });
}
