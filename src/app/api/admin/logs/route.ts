import { NextResponse } from "next/server";
import { getLogs } from "@/lib/configStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;
  const logs = await getLogs(Number.isNaN(limit) ? 50 : limit);
  return NextResponse.json({ logs });
}
