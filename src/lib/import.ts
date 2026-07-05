import * as XLSX from "xlsx";
import { prisma } from "./prisma";

export interface ParsedCustomer {
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
  phase: string | null;
  auditDate: string | null;
  caseQty: number;
}

export interface ImportResult {
  total: number;
  imported: number;
  updated: number;
  skippedNoName: number;
  missingCoords: number;
  missingAddress: number;
}

// Normalize mislabeled/duplicate region names to their base region.
function normalizeRegion(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "Unknown";
  const lower = s.toLowerCase();
  if (lower.startsWith("khulna")) return "Khulna";
  if (lower.startsWith("mymensingh")) return "Mymensingh";
  if (lower.startsWith("dhaka outer")) return "Dhaka Outer";
  if (lower.startsWith("dhaka metro")) return "Dhaka Metro";
  if (lower.startsWith("bogra") || lower.startsWith("bogura")) return "Bogra";
  if (lower.startsWith("chittagong") || lower.startsWith("chattogram")) return "Chittagong";
  return s;
}

function cleanStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v)
    .replace(/_x000D_/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length ? s : null;
}

function parseCoords(v: unknown): { lat: number | null; lng: number | null } {
  const s = cleanStr(v);
  if (!s) return { lat: null, lng: null };
  const parts = s.split(",").map((p) => parseFloat(p.trim()));
  if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    return { lat: parts[0], lng: parts[1] };
  }
  return { lat: null, lng: null };
}

function parseNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

const COL = {
  sl: "Sl.",
  region: "REGION Name",
  area: "AREA Name",
  se: "SE Area",
  dbCode: "DB Code",
  masterId: "Master ID",
  dbName: "DB Name",
  proprietor: "Proprietors Name",
  mobile: "Customer Mobile Phone",
  coords: "Customer Address Coordinates",
  address: "Customer Address",
  phase: "Initial Phase",
  audit: "Audit Date",
  caseQty: "Case Qty (Raw Case)",
};

/** Parse an xlsx buffer (header on sheet row 3 / index 2) into customer records. */
export function parseCustomers(buffer: Buffer | ArrayBuffer): ParsedCustomer[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    range: 2, // row 3 (1-indexed) is the header
    defval: null,
  });

  const out: ParsedCustomer[] = [];
  for (const r of rows) {
    const dbName = cleanStr(r[COL.dbName]);
    if (!dbName) continue; // rows without a business name are noise
    const { lat, lng } = parseCoords(r[COL.coords]);
    const slRaw = r[COL.sl];
    out.push({
      slNo: slRaw != null && slRaw !== "" ? parseInt(String(slRaw), 10) || null : null,
      regionName: normalizeRegion(r[COL.region]),
      areaName: cleanStr(r[COL.area]),
      seArea: cleanStr(r[COL.se]),
      dbCode: cleanStr(r[COL.dbCode]),
      masterId: cleanStr(r[COL.masterId]),
      dbName,
      proprietorName: cleanStr(r[COL.proprietor]),
      mobilePhone: cleanStr(r[COL.mobile]),
      latitude: lat,
      longitude: lng,
      address: cleanStr(r[COL.address]),
      phase: cleanStr(r[COL.phase]),
      auditDate: cleanStr(r[COL.audit]),
      caseQty: parseNum(r[COL.caseQty]),
    });
  }
  return out;
}

/**
 * Upsert parsed customers. Dedup key = dbCode+masterId when present, else slNo, else dbName.
 * Rows missing coordinates are still imported (flagged as needs-geocoding).
 */
export async function upsertCustomers(records: ParsedCustomer[]): Promise<ImportResult> {
  const result: ImportResult = {
    total: records.length,
    imported: 0,
    updated: 0,
    skippedNoName: 0,
    missingCoords: 0,
    missingAddress: 0,
  };

  for (const rec of records) {
    if (!rec.dbName) {
      result.skippedNoName++;
      continue;
    }
    if (rec.latitude == null || rec.longitude == null) result.missingCoords++;
    if (!rec.address) result.missingAddress++;

    // Find an existing match on a stable natural key.
    const existing = await prisma.customer.findFirst({
      where: rec.dbCode
        ? { dbCode: rec.dbCode, masterId: rec.masterId }
        : rec.slNo != null
        ? { slNo: rec.slNo, dbName: rec.dbName }
        : { dbName: rec.dbName },
    });

    if (existing) {
      await prisma.customer.update({ where: { id: existing.id }, data: rec });
      result.updated++;
    } else {
      await prisma.customer.create({ data: rec });
      result.imported++;
    }
  }
  return result;
}
