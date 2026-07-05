import { prisma } from "./prisma";
import { haversineKm, hasCoords } from "./geo";
import { osrmRoute } from "./routing";

export interface RbuRanking {
  rbuId: string;
  name: string;
  isFactory: boolean;
  latitude: number;
  longitude: number;
  straightLineKm: number;
  roadDistanceKm: number | null;
  roadDurationMin: number | null;
}

export interface CustomerDistanceReport {
  customerId: string;
  suggestedRbuId: string | null;
  ranked: RbuRanking[];
  suggestedToFactoryKm: number | null;
  suggestedToFactoryMin: number | null;
}

/**
 * Rank all (non-factory) RBUs for a customer.
 * Step 1: Haversine rank (free). Step 2: confirm the top `confirmTopN` with OSRM road distance.
 * Suggested RBU = lowest road distance among confirmed candidates (falls back to straight-line).
 */
export async function rankRbusForCustomer(
  customerId: string,
  confirmTopN = 2
): Promise<CustomerDistanceReport> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  const rbus = await prisma.rbu.findMany();
  const factory = rbus.find((r) => r.isFactory) ?? null;
  const collectionRbus = rbus.filter((r) => !r.isFactory);

  const empty: CustomerDistanceReport = {
    customerId,
    suggestedRbuId: null,
    ranked: [],
    suggestedToFactoryKm: null,
    suggestedToFactoryMin: null,
  };
  if (!customer || !hasCoords(customer)) return empty;

  const ranked: RbuRanking[] = collectionRbus
    .filter(hasCoords)
    .map((r) => ({
      rbuId: r.id,
      name: r.name,
      isFactory: r.isFactory,
      latitude: r.latitude,
      longitude: r.longitude,
      straightLineKm: haversineKm(customer, r),
      roadDistanceKm: null as number | null,
      roadDurationMin: null as number | null,
    }))
    .sort((a, b) => a.straightLineKm - b.straightLineKm);

  if (ranked.length === 0) return empty;

  // Confirm the nearest candidates with real road distance.
  const toConfirm = ranked.slice(0, Math.max(1, confirmTopN));
  await Promise.all(
    toConfirm.map(async (cand) => {
      const leg = await osrmRoute([
        customer,
        { latitude: cand.latitude, longitude: cand.longitude },
      ]);
      if (leg) {
        cand.roadDistanceKm = leg.roadDistanceKm;
        cand.roadDurationMin = leg.roadDurationMin;
      }
    })
  );

  // Suggested = lowest road distance among confirmed; else nearest straight-line.
  const confirmed = ranked.filter((r) => r.roadDistanceKm != null);
  let suggested: RbuRanking;
  if (confirmed.length > 0) {
    confirmed.sort((a, b) => (a.roadDistanceKm! - b.roadDistanceKm!));
    suggested = confirmed[0];
  } else {
    suggested = ranked[0];
  }

  // Re-sort full list: road-confirmed first (by road km), then remaining by straight-line.
  ranked.sort((a, b) => {
    if (a.roadDistanceKm != null && b.roadDistanceKm != null)
      return a.roadDistanceKm - b.roadDistanceKm;
    if (a.roadDistanceKm != null) return -1;
    if (b.roadDistanceKm != null) return 1;
    return a.straightLineKm - b.straightLineKm;
  });

  // Suggested RBU -> Factory chain.
  let suggestedToFactoryKm: number | null = null;
  let suggestedToFactoryMin: number | null = null;
  if (factory && hasCoords(factory)) {
    const leg = await osrmRoute([
      { latitude: suggested.latitude, longitude: suggested.longitude },
      factory,
    ]);
    if (leg) {
      suggestedToFactoryKm = leg.roadDistanceKm;
      suggestedToFactoryMin = leg.roadDurationMin;
    } else {
      suggestedToFactoryKm = haversineKm(suggested, factory);
    }
  }

  return {
    customerId,
    suggestedRbuId: suggested.rbuId,
    ranked,
    suggestedToFactoryKm,
    suggestedToFactoryMin,
  };
}

/**
 * Recompute + persist assignedRbuId for one customer (used after edits).
 */
export async function recomputeAssignment(customerId: string): Promise<string | null> {
  const report = await rankRbusForCustomer(customerId, 2);
  await prisma.customer.update({
    where: { id: customerId },
    data: { assignedRbuId: report.suggestedRbuId },
  });
  return report.suggestedRbuId;
}

/**
 * Fast bulk assignment using Haversine only (no external calls) — used after
 * an RBU is added/edited/removed to re-point affected customers quickly.
 */
export async function bulkReassignByHaversine(): Promise<void> {
  const rbus = (await prisma.rbu.findMany()).filter((r) => !r.isFactory && hasCoords(r));
  const customers = await prisma.customer.findMany();
  for (const c of customers) {
    if (!hasCoords(c) || rbus.length === 0) {
      if (c.assignedRbuId !== null)
        await prisma.customer.update({ where: { id: c.id }, data: { assignedRbuId: null } });
      continue;
    }
    let best = rbus[0];
    let bestKm = haversineKm(c, best);
    for (const r of rbus.slice(1)) {
      const km = haversineKm(c, r);
      if (km < bestKm) {
        bestKm = km;
        best = r;
      }
    }
    if (c.assignedRbuId !== best.id)
      await prisma.customer.update({ where: { id: c.id }, data: { assignedRbuId: best.id } });
  }
}
