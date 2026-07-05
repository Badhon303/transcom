import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export async function GET() {
  try {
    await requireRole();
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole("BPCL_ADMIN");
    const body = await req.json();
    const row = await prisma.settings.upsert({
      where: { id: "singleton" },
      update: {
        lowVolumeThresholdCases: body.lowVolumeThresholdCases,
        clusterRadiusKm: body.clusterRadiusKm,
      },
      create: {
        id: "singleton",
        lowVolumeThresholdCases: body.lowVolumeThresholdCases ?? 300,
        clusterRadiusKm: body.clusterRadiusKm ?? 15,
      },
    });
    return NextResponse.json({
      lowVolumeThresholdCases: row.lowVolumeThresholdCases,
      clusterRadiusKm: row.clusterRadiusKm,
    });
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
