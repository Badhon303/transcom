import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/session";
import { bulkReassignByHaversine } from "@/lib/distance";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("BPCL_ADMIN");
    const body = await req.json();
    const before = await prisma.rbu.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.isFactory) {
      await prisma.rbu.updateMany({
        data: { isFactory: false },
        where: { isFactory: true, NOT: { id: params.id } },
      });
    }
    const updated = await prisma.rbu.update({
      where: { id: params.id },
      data: {
        name: body.name ?? before.name,
        latitude: body.latitude ?? before.latitude,
        longitude: body.longitude ?? before.longitude,
        address: body.address ?? before.address,
        capacityNotes: body.capacityNotes ?? before.capacityNotes,
        isFactory: body.isFactory ?? before.isFactory,
      },
    });
    await bulkReassignByHaversine();
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
    await prisma.rbu.delete({ where: { id: params.id } });
    await bulkReassignByHaversine();
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
