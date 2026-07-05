import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/session";
import { osrmRoute } from "@/lib/routing";
import { hasCoords } from "@/lib/geo";

export async function GET() {
  try {
    await requireRole();
    const runs = await prisma.run.findMany({
      include: {
        rbu: true,
        stops: { include: { customer: true }, orderBy: { stopOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(runs);
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Create/save a run: { rbuId, status?, customerIds: string[] (ordered) }
export async function POST(req: NextRequest) {
  try {
    await requireRole("BPCL_ADMIN");
    const body = await req.json();
    const rbuId: string = body.rbuId;
    const customerIds: string[] = body.customerIds || [];
    if (!rbuId || customerIds.length === 0) {
      return NextResponse.json(
        { error: "rbuId and at least one customer are required" },
        { status: 400 }
      );
    }

    const rbu = await prisma.rbu.findUnique({ where: { id: rbuId } });
    if (!rbu) return NextResponse.json({ error: "RBU not found" }, { status: 404 });
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
    });
    const byId = new Map(customers.map((c) => [c.id, c]));

    // Compute totals via OSRM through ordered waypoints (RBU -> stops -> RBU).
    const waypoints = [
      { latitude: rbu.latitude, longitude: rbu.longitude },
      ...customerIds
        .map((id) => byId.get(id))
        .filter((c): c is NonNullable<typeof c> => !!c && hasCoords(c))
        .map((c) => ({ latitude: c.latitude as number, longitude: c.longitude as number })),
      { latitude: rbu.latitude, longitude: rbu.longitude },
    ];
    let totalDistanceKm: number | null = null;
    let totalDurationMin: number | null = null;
    if (waypoints.length >= 2) {
      const leg = await osrmRoute(waypoints);
      if (leg) {
        totalDistanceKm = leg.roadDistanceKm;
        totalDurationMin = leg.roadDurationMin;
      }
    }

    const run = await prisma.run.create({
      data: {
        rbuId,
        status: body.status === "COMPLETED" ? "COMPLETED" : "PLANNED",
        totalDistanceKm,
        totalDurationMin,
        stops: {
          create: customerIds.map((customerId, i) => ({
            customerId,
            stopOrder: i,
          })),
        },
      },
      include: {
        rbu: true,
        stops: { include: { customer: true }, orderBy: { stopOrder: "asc" } },
      },
    });
    return NextResponse.json(run, { status: 201 });
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
