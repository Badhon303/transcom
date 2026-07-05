// Shared client-side types (mirror the Prisma models where needed).

export interface Customer {
  id: string;
  slNo: number | null;
  regionName: string;
  areaName: string | null;
  seArea: string | null;
  dbCode: string | null;
  masterId: string | null;
  dbName: string;
  proprietorName: string | null;
  mobilePhone: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  caseQty: number;
  phase: string | null;
  auditDate: string | null;
  assignedRbuId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Rbu {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  capacityNotes: string | null;
  isFactory: boolean;
  customerCount?: number;
  totalCaseQty?: number;
  distanceToFactoryKm?: number | null;
}

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

export interface DistanceReport {
  customerId: string;
  suggestedRbuId: string | null;
  ranked: RbuRanking[];
  suggestedToFactoryKm: number | null;
  suggestedToFactoryMin: number | null;
  caseQty: number;
  lowVolumeThresholdCases: number;
  isLowVolume: boolean;
}

export interface AppSettings {
  lowVolumeThresholdCases: number;
  clusterRadiusKm: number;
}

export interface RunStop {
  id: string;
  runId: string;
  customerId: string;
  stopOrder: number;
  customer: Customer;
}

export interface Run {
  id: string;
  rbuId: string;
  rbu: Rbu;
  status: "PLANNED" | "COMPLETED";
  totalDistanceKm: number | null;
  totalDurationMin: number | null;
  stops: RunStop[];
  createdAt: string;
}

export interface RunSuggestion {
  rbuId: string;
  rbuName: string;
  stops: { id: string; dbName: string; caseQty: number; latitude: number; longitude: number }[];
  totalCaseQty: number;
}

// Marker size buckets calibrated to the real caseQty distribution (24.6–8388).
export function caseQtyBucket(qty: number): { radius: number; label: string } {
  if (qty >= 4000) return { radius: 16, label: "X-Large (4000+)" };
  if (qty >= 1500) return { radius: 12, label: "Large (1500–4000)" };
  if (qty >= 500) return { radius: 9, label: "Medium (500–1500)" };
  return { radius: 6, label: "Small (<500)" };
}
