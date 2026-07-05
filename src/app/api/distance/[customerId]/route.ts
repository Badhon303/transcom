import { NextRequest, NextResponse } from "next/server";
import { requireRole, HttpError } from "@/lib/session";
import { rankRbusForCustomer } from "@/lib/distance";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    await requireRole();
    const report = await rankRbusForCustomer(params.customerId, 2);
    const settings = await getSettings();
    const customer = await prisma.customer.findUnique({
      where: { id: params.customerId },
    });
    const isLowVolume =
      (customer?.caseQty ?? 0) < settings.lowVolumeThresholdCases;
    return NextResponse.json({
      ...report,
      caseQty: customer?.caseQty ?? 0,
      lowVolumeThresholdCases: settings.lowVolumeThresholdCases,
      isLowVolume,
    });
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
