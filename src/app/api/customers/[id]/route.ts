import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/session";
import { recomputeAssignment } from "@/lib/distance";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole();
    const c = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(c);
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("TRANSCOM_ADMIN");
    const body = await req.json();
    const before = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: {
        slNo: body.slNo ?? before.slNo,
        regionName: body.regionName ?? before.regionName,
        areaName: body.areaName ?? before.areaName,
        seArea: body.seArea ?? before.seArea,
        dbCode: body.dbCode ?? before.dbCode,
        masterId: body.masterId ?? before.masterId,
        dbName: body.dbName ?? before.dbName,
        proprietorName: body.proprietorName ?? before.proprietorName,
        mobilePhone: body.mobilePhone ?? before.mobilePhone,
        latitude: body.latitude ?? before.latitude,
        longitude: body.longitude ?? before.longitude,
        address: body.address ?? before.address,
        caseQty: body.caseQty ?? before.caseQty,
        phase: body.phase ?? before.phase,
        auditDate: body.auditDate ?? before.auditDate,
        assignedRbuId: body.assignedRbuId !== undefined ? body.assignedRbuId : before.assignedRbuId,
      },
    });

    // Recompute assignment if coordinates changed.
    const coordsChanged =
      updated.latitude !== before.latitude ||
      updated.longitude !== before.longitude;
    if (coordsChanged && updated.latitude != null && updated.longitude != null) {
      await recomputeAssignment(updated.id);
    }
    const fresh = await prisma.customer.findUnique({ where: { id: params.id } });
    return NextResponse.json(fresh);
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
    await requireRole("TRANSCOM_ADMIN");
    await prisma.customer.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
