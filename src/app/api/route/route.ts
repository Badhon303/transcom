import { NextRequest, NextResponse } from "next/server";
import { requireRole, HttpError } from "@/lib/session";
import { osrmRoute } from "@/lib/routing";

// POST { points: [{latitude, longitude}, ...] } -> road polyline + totals.
export async function POST(req: NextRequest) {
  try {
    await requireRole();
    const body = await req.json();
    const points = body.points;
    if (!Array.isArray(points) || points.length < 2) {
      return NextResponse.json({ error: "Need >= 2 points" }, { status: 400 });
    }
    const leg = await osrmRoute(points);
    if (!leg)
      return NextResponse.json({ error: "Routing failed" }, { status: 502 });
    return NextResponse.json(leg);
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
