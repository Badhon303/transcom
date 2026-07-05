import { haversineKm } from "./geo";

export interface StopPoint {
  id: string;
  latitude: number;
  longitude: number;
  caseQty: number;
}

/**
 * Distance-based single-linkage clustering: groups points that are within
 * `radiusKm` of at least one other member of the cluster.
 */
export function clusterByRadius(points: StopPoint[], radiusKm: number): StopPoint[][] {
  const clusters: StopPoint[][] = [];
  const visited = new Set<string>();

  for (const p of points) {
    if (visited.has(p.id)) continue;
    const cluster: StopPoint[] = [];
    const queue = [p];
    visited.add(p.id);
    while (queue.length) {
      const cur = queue.pop()!;
      cluster.push(cur);
      for (const other of points) {
        if (visited.has(other.id)) continue;
        if (haversineKm(cur, other) <= radiusKm) {
          visited.add(other.id);
          queue.push(other);
        }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

/**
 * Nearest-neighbor stop ordering starting from `origin` (the RBU).
 * Returns points ordered to greedily minimize travel; not a full TSP.
 */
export function nearestNeighborOrder(
  origin: { latitude: number; longitude: number },
  points: StopPoint[]
): StopPoint[] {
  const remaining = [...points];
  const ordered: StopPoint[] = [];
  let cursor: { latitude: number; longitude: number } = origin;

  while (remaining.length) {
    let bestIdx = 0;
    let bestKm = haversineKm(cursor, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const km = haversineKm(cursor, remaining[i]);
      if (km < bestKm) {
        bestKm = km;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cursor = next;
  }
  return ordered;
}
