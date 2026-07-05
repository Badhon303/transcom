import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/session";
import { recomputeAssignment } from "@/lib/distance";

export async function GET(req: NextRequest) {
  try {
    await requireRole(); // any authenticated user
    const { searchParams } = new URL(req.url);
    const region = searchParams.get("region");
    const rbuId = searchParams.get("rbuId");
    const minQty = searchParams.get("minQty");
    const q = searchParams.get("q");

    const customers = await prisma.customer.findMany({
      where: {
        ...(region ? { regionName: region } : {}),
        ...(rbuId ? { assignedRbuId: rbuId } : {}),
        ...(minQty ? { caseQty: { gte: parseFloat(minQty) } } : {}),
        ...(q
          ? {
              OR: [
                { dbName: { contains: q } },
                { proprietorName: { contains: q } },
                { dbCode: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { dbName: "asc" },
    });
    return NextResponse.json(customers);
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("TRANSCOM_ADMIN");
    const body = await req.json();
    const created = await prisma.customer.create({
      data: {
        slNo: body.slNo ?? null,
        regionName: body.regionName || "Unknown",
        areaName: body.areaName ?? null,
        seArea: body.seArea ?? null,
        dbCode: body.dbCode ?? null,
        masterId: body.masterId ?? null,
        dbName: body.dbName,
        proprietorName: body.proprietorName ?? null,
        mobilePhone: body.mobilePhone ?? null,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        address: body.address ?? null,
        caseQty: body.caseQty ?? 0,
        phase: body.phase ?? null,
        auditDate: body.auditDate ?? null,
      },
    });
    if (created.latitude != null && created.longitude != null) {
      await recomputeAssignment(created.id);
    }
    const fresh = await prisma.customer.findUnique({ where: { id: created.id } });
    return NextResponse.json(fresh, { status: 201 });
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
