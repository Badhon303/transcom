import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/session";
import { osrmRoute } from "@/lib/routing";
import { hasCoords } from "@/lib/geo";

// Update a run's stops/status: { status?, customerIds?: string[] (ordered) }
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("BPCL_ADMIN");
    const body = await req.json();
    const run = await prisma.run.findUnique({
      where: { id: params.id },
      include: { rbu: true },
    });
    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let totalDistanceKm = run.totalDistanceKm;
    let totalDurationMin = run.totalDurationMin;

    if (Array.isArray(body.customerIds)) {
      const customerIds: string[] = body.customerIds;
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
      });
      const byId = new Map(customers.map((c) => [c.id, c]));

      await prisma.runStop.deleteMany({ where: { runId: run.id } });
      await prisma.runStop.createMany({
        data: customerIds.map((customerId, i) => ({
          runId: run.id,
          customerId,
          stopOrder: i,
        })),
      });

      const waypoints = [
        { latitude: run.rbu.latitude, longitude: run.rbu.longitude },
        ...customerIds
          .map((id) => byId.get(id))
          .filter((c): c is NonNullable<typeof c> => !!c && hasCoords(c))
          .map((c) => ({ latitude: c.latitude as number, longitude: c.longitude as number })),
        { latitude: run.rbu.latitude, longitude: run.rbu.longitude },
      ];
      const leg = waypoints.length >= 2 ? await osrmRoute(waypoints) : null;
      totalDistanceKm = leg?.roadDistanceKm ?? null;
      totalDurationMin = leg?.roadDurationMin ?? null;
    }

    const updated = await prisma.run.update({
      where: { id: run.id },
      data: {
        status: body.status ?? run.status,
        totalDistanceKm,
        totalDurationMin,
      },
      include: {
        rbu: true,
        stops: { include: { customer: true }, orderBy: { stopOrder: "asc" } },
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("BPCL_ADMIN");
    await prisma.run.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
