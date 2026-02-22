import { NextResponse } from "next/server";
// TODO: Deepgram webhook callback handler

export async function POST() {
  return NextResponse.json({ received: true });
}
