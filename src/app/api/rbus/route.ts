import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/session";
import { bulkReassignByHaversine } from "@/lib/distance";
import { haversineKm, hasCoords } from "@/lib/geo";

export async function GET() {
  try {
    await requireRole();
    const rbus = await prisma.rbu.findMany({ orderBy: { isFactory: "asc" } });
    const customers = await prisma.customer.findMany({
      select: { assignedRbuId: true, caseQty: true },
    });
    const factory = rbus.find((r) => r.isFactory) ?? null;

    const enriched = rbus.map((r) => {
      const assigned = customers.filter((c) => c.assignedRbuId === r.id);
      const totalCaseQty = assigned.reduce((s, c) => s + c.caseQty, 0);
      let distanceToFactoryKm: number | null = null;
      if (factory && !r.isFactory && hasCoords(r) && hasCoords(factory)) {
        distanceToFactoryKm = haversineKm(r, factory);
      }
      return {
        ...r,
        customerCount: assigned.length,
        totalCaseQty,
        distanceToFactoryKm,
      };
    });
    return NextResponse.json(enriched);
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("BPCL_ADMIN");
    const body = await req.json();
    // Enforce a single factory.
    if (body.isFactory) {
      await prisma.rbu.updateMany({ data: { isFactory: false }, where: { isFactory: true } });
    }
    const created = await prisma.rbu.create({
      data: {
        name: body.name,
        latitude: body.latitude,
        longitude: body.longitude,
        address: body.address ?? null,
        capacityNotes: body.capacityNotes ?? null,
        isFactory: !!body.isFactory,
      },
    });
    await bulkReassignByHaversine();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
