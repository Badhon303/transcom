import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, HttpError } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { clusterByRadius, nearestNeighborOrder, StopPoint } from "@/lib/clustering";
import { hasCoords } from "@/lib/geo";

// Auto-suggest multi-stop runs: cluster each RBU's low-volume customers, order via NN.
export async function GET() {
  try {
    await requireRole();
    const settings = await getSettings();
    const rbus = (await prisma.rbu.findMany()).filter((r) => !r.isFactory);
    const customers = await prisma.customer.findMany();

    const suggestions: {
      rbuId: string;
      rbuName: string;
      stops: { id: string; dbName: string; caseQty: number; latitude: number; longitude: number }[];
      totalCaseQty: number;
    }[] = [];

    for (const rbu of rbus) {
      if (!hasCoords(rbu)) continue;
      const lowVol = customers.filter(
        (c) =>
          c.assignedRbuId === rbu.id &&
          hasCoords(c) &&
          c.caseQty < settings.lowVolumeThresholdCases
      );
      const points: StopPoint[] = lowVol.map((c) => ({
        id: c.id,
        latitude: c.latitude as number,
        longitude: c.longitude as number,
        caseQty: c.caseQty,
      }));
      const clusters = clusterByRadius(points, settings.clusterRadiusKm);
      for (const cluster of clusters) {
        if (cluster.length < 2) continue; // single stops aren't "multi-stop runs"
        const ordered = nearestNeighborOrder(rbu, cluster);
        const stops = ordered.map((p) => {
          const c = lowVol.find((x) => x.id === p.id)!;
          return {
            id: c.id,
            dbName: c.dbName,
            caseQty: c.caseQty,
            latitude: c.latitude as number,
            longitude: c.longitude as number,
          };
        });
        suggestions.push({
          rbuId: rbu.id,
          rbuName: rbu.name,
          stops,
          totalCaseQty: stops.reduce((s, x) => s + x.caseQty, 0),
        });
      }
    }

    return NextResponse.json({
      lowVolumeThresholdCases: settings.lowVolumeThresholdCases,
      clusterRadiusKm: settings.clusterRadiusKm,
      suggestions,
    });
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
