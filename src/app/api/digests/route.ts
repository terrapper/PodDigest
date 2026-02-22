import { NextResponse } from "next/server";
// TODO: Implement digests CRUD endpoint

export async function GET() {
  return NextResponse.json({ digests: [] });
}

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
