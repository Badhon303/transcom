// Geospatial helpers. Haversine is free and used for candidate pre-filtering.

export interface LatLng {
  latitude: number;
  longitude: number;
}

const R = 6371; // Earth radius in km

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Straight-line (great-circle) distance in kilometers. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function hasCoords<
  T extends { latitude?: number | null; longitude?: number | null }
>(p: T | null | undefined): p is T & LatLng {
  return (
    !!p &&
    typeof p.latitude === "number" &&
    typeof p.longitude === "number" &&
    !Number.isNaN(p.latitude) &&
    !Number.isNaN(p.longitude)
  );
}

// Bangladesh bounding box center for default map view.
export const BANGLADESH_CENTER: [number, number] = [23.685, 90.3563];
export const DEFAULT_ZOOM = 7;
