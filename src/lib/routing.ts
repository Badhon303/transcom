// OSRM road-distance/duration + route geometry helpers.
// Uses the public demo server by default (set OSRM_BASE_URL for a private instance).

const OSRM_BASE = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";

export interface RouteLeg {
  roadDistanceKm: number;
  roadDurationMin: number;
  /** [lat, lng][] polyline for drawing on the map. */
  geometry: [number, number][];
}

type Coord = { latitude: number; longitude: number };

function coordString(points: Coord[]): string {
  // OSRM expects lng,lat;lng,lat
  return points.map((p) => `${p.longitude},${p.latitude}`).join(";");
}

function decodeGeoJson(coords: [number, number][]): [number, number][] {
  // GeoJSON is [lng, lat] -> convert to [lat, lng]
  return coords.map(([lng, lat]) => [lat, lng]);
}

/**
 * Get a road route through an ordered list of waypoints (2+).
 * Returns total distance/duration and the full polyline, or null on failure.
 */
export async function osrmRoute(points: Coord[]): Promise<RouteLeg | null> {
  if (points.length < 2) return null;
  const url = `${OSRM_BASE}/route/v1/driving/${coordString(
    points
  )}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    return {
      roadDistanceKm: route.distance / 1000,
      roadDurationMin: route.duration / 60,
      geometry: decodeGeoJson(route.geometry?.coordinates || []),
    };
  } catch {
    return null;
  }
}

/**
 * Optimized trip through waypoints (nearest-neighbor / TSP-ish) via OSRM /trip.
 * Returns ordering indexes plus totals. Falls back to null on failure.
 */
export async function osrmTrip(
  points: Coord[],
  opts: { roundTrip?: boolean; source?: "first" | "any" } = {}
): Promise<{ order: number[]; leg: RouteLeg } | null> {
  if (points.length < 2) return null;
  const roundTrip = opts.roundTrip ?? false;
  const source = opts.source ?? "first";
  const url = `${OSRM_BASE}/trip/v1/driving/${coordString(
    points
  )}?roundtrip=${roundTrip}&source=${source}&overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const trip = data?.trips?.[0];
    if (!trip) return null;
    const order = (data.waypoints || [])
      .map((w: { waypoint_index: number }, i: number) => ({
        i,
        pos: w.waypoint_index,
      }))
      .sort((a: { pos: number }, b: { pos: number }) => a.pos - b.pos)
      .map((w: { i: number }) => w.i);
    return {
      order,
      leg: {
        roadDistanceKm: trip.distance / 1000,
        roadDurationMin: trip.duration / 60,
        geometry: decodeGeoJson(trip.geometry?.coordinates || []),
      },
    };
  } catch {
    return null;
  }
}
