import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// geoBoundaries open data: Bangladesh ADM3 (upazilas / thanas) simplified geometry.
const GEOBOUNDARIES_META =
  "https://www.geoboundaries.org/api/current/gbOpen/BGD/ADM3/";

const WIDTH = 4200;
const PADDING = 80;

// Major cities / district towns shown as reference locations (like a printed map).
const CITIES: { name: string; lat: number; lng: number; major?: boolean }[] = [
  { name: "Dhaka", lat: 23.8103, lng: 90.4125, major: true },
  { name: "Chittagong", lat: 22.3569, lng: 91.7832, major: true },
  { name: "Khulna", lat: 22.8456, lng: 89.5403, major: true },
  { name: "Rajshahi", lat: 24.3745, lng: 88.6042, major: true },
  { name: "Sylhet", lat: 24.8949, lng: 91.8687, major: true },
  { name: "Barishal", lat: 22.701, lng: 90.3535, major: true },
  { name: "Rangpur", lat: 25.7439, lng: 89.2752, major: true },
  { name: "Mymensingh", lat: 24.7471, lng: 90.4203, major: true },
  { name: "Comilla", lat: 23.4607, lng: 91.1809 },
  { name: "Narayanganj", lat: 23.6238, lng: 90.5 },
  { name: "Gazipur", lat: 23.9999, lng: 90.4203 },
  { name: "Bogra", lat: 24.8465, lng: 89.377 },
  { name: "Jessore", lat: 23.1667, lng: 89.2089 },
  { name: "Cox's Bazar", lat: 21.4272, lng: 92.0058 },
  { name: "Narsingdi", lat: 23.9322, lng: 90.715 },
  { name: "Tangail", lat: 24.2513, lng: 89.9167 },
  { name: "Dinajpur", lat: 25.6217, lng: 88.6354 },
  { name: "Pabna", lat: 24.0064, lng: 89.2372 },
  { name: "Kushtia", lat: 23.9013, lng: 89.1205 },
  { name: "Faridpur", lat: 23.607, lng: 89.8429 },
  { name: "Noakhali", lat: 22.8696, lng: 91.0995 },
  { name: "Feni", lat: 23.0159, lng: 91.3976 },
  { name: "Brahmanbaria", lat: 23.9571, lng: 91.1119 },
  { name: "Sirajganj", lat: 24.4534, lng: 89.7007 },
  { name: "Jamalpur", lat: 24.9375, lng: 89.9373 },
  { name: "Satkhira", lat: 22.7185, lng: 89.0705 },
  { name: "Patuakhali", lat: 22.3596, lng: 90.3298 },
  { name: "Habiganj", lat: 24.3745, lng: 91.4155 },
  { name: "Moulvibazar", lat: 24.4829, lng: 91.7774 },
  { name: "Chandpur", lat: 23.2333, lng: 90.6667 },
  { name: "Lakshmipur", lat: 22.9447, lng: 90.8282 },
  { name: "Sherpur", lat: 25.0205, lng: 90.0153 },
  { name: "Netrokona", lat: 24.871, lng: 90.729 },
  { name: "Kishoreganj", lat: 24.426, lng: 90.7829 },
  { name: "Munshiganj", lat: 23.5422, lng: 90.5305 },
  { name: "Manikganj", lat: 23.8617, lng: 90.0003 },
  { name: "Madaripur", lat: 23.1641, lng: 90.1897 },
  { name: "Gopalganj", lat: 23.005, lng: 89.8266 },
  { name: "Shariatpur", lat: 23.2423, lng: 90.4348 },
  { name: "Rangamati", lat: 22.7324, lng: 92.2985 },
  { name: "Bandarban", lat: 22.1953, lng: 92.2184 },
  { name: "Khagrachhari", lat: 23.1193, lng: 91.9847 },
  { name: "Panchagarh", lat: 26.3411, lng: 88.5542 },
  { name: "Thakurgaon", lat: 26.0337, lng: 88.4616 },
  { name: "Nilphamari", lat: 25.931, lng: 88.856 },
  { name: "Lalmonirhat", lat: 25.9923, lng: 89.2847 },
  { name: "Kurigram", lat: 25.8054, lng: 89.6362 },
  { name: "Gaibandha", lat: 25.3288, lng: 89.5286 },
  { name: "Joypurhat", lat: 25.0968, lng: 89.0227 },
  { name: "Naogaon", lat: 24.7936, lng: 88.9318 },
  { name: "Natore", lat: 24.4206, lng: 88.9414 },
  { name: "Chapainawabganj", lat: 24.5965, lng: 88.2775 },
  { name: "Meherpur", lat: 23.7622, lng: 88.6318 },
  { name: "Chuadanga", lat: 23.6402, lng: 88.8412 },
  { name: "Jhenaidah", lat: 23.545, lng: 89.1726 },
  { name: "Magura", lat: 23.4855, lng: 89.4198 },
  { name: "Narail", lat: 23.1163, lng: 89.584 },
  { name: "Bagerhat", lat: 22.6576, lng: 89.7895 },
  { name: "Pirojpur", lat: 22.5841, lng: 89.972 },
  { name: "Jhalokati", lat: 22.6406, lng: 90.1987 },
  { name: "Bhola", lat: 22.6859, lng: 90.6482 },
  { name: "Barguna", lat: 22.0953, lng: 90.1121 },
  { name: "Sunamganj", lat: 25.0658, lng: 91.395 },
];

const REGION_COLORS: Record<string, string> = {
  Khulna: "#e11d48",
  Mymensingh: "#7c3aed",
  "Dhaka Outer": "#0891b2",
  "Dhaka Metro": "#2563eb",
  Bogra: "#ca8a04",
  Chittagong: "#16a34a",
};
const FALLBACK_COLOR = "#64748b";

type Ring = [number, number][];

interface Projector {
  (lng: number, lat: number): [number, number];
  height: number;
}

function makeProjector(minLng: number, maxLng: number, minLat: number, maxLat: number): Projector {
  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const kx = Math.cos(midLat); // shrink longitude to keep aspect roughly correct
  const spanX = (maxLng - minLng) * kx;
  const spanY = maxLat - minLat;
  const scale = (WIDTH - 2 * PADDING) / spanX;
  const height = spanY * scale + 2 * PADDING;
  const fn = ((lng: number, lat: number): [number, number] => [
    PADDING + (lng - minLng) * kx * scale,
    PADDING + (maxLat - lat) * scale,
  ]) as Projector;
  fn.height = height;
  return fn;
}

function ringToPath(ring: Ring, project: Projector): string {
  return (
    ring
      .map(([lng, lat], i) => {
        const [x, y] = project(lng, lat);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join("") + "Z"
  );
}

function radiusForCases(qty: number, maxCases: number): number {
  if (maxCases <= 0) return 3.5;
  const r = 2.5 + Math.sqrt(qty / maxCases) * 14;
  return Math.max(2.5, Math.min(18, r));
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function fetchBoundary(): Promise<any> {
  const meta = await (await fetch(GEOBOUNDARIES_META)).json();
  const url: string = meta.simplifiedGeometryGeoJSON ?? meta.gjDownloadURL;
  console.log(`Fetching boundary GeoJSON: ${url}`);
  return await (await fetch(url)).json();
}

async function main() {
  const [geojson, customers, rbus] = await Promise.all([
    fetchBoundary(),
    prisma.customer.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: {
        dbName: true,
        dbCode: true,
        masterId: true,
        areaName: true,
        seArea: true,
        address: true,
        regionName: true,
        latitude: true,
        longitude: true,
        caseQty: true,
        assignedRbu: { select: { name: true } },
      },
    }),
    prisma.rbu.findMany({
      select: { name: true, latitude: true, longitude: true, isFactory: true },
    }),
  ]);

  // Compute bounding box across boundary + all points.
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const eachRing = (cb: (ring: Ring, name: string) => void) => {
    for (const feature of geojson.features) {
      const name = feature.properties?.shapeName ?? "";
      const g = feature.geometry;
      const polys: Ring[][] = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
      for (const poly of polys) for (const ring of poly) cb(ring as Ring, name);
    }
  };
  eachRing((ring) => {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  });

  const project = makeProjector(minLng, maxLng, minLat, maxLat);
  const height = Math.ceil(project.height);

  // Upazilla / thana-level polygons
  const divisionPaths: string[] = [];
  const upazillaLabelData: { x: number; y: number; name: string }[] = [];
  for (const feature of geojson.features) {
    const name = feature.properties?.shapeName ?? "";
    const g = feature.geometry;
    const polys: Ring[][] = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    const d = polys.map((poly) => poly.map((ring) => ringToPath(ring as Ring, project)).join("")).join("");
    divisionPaths.push(
      `  <path d="${d}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.4"><title>${esc(name)}</title></path>`
    );
    // Centroid of the largest outer ring for the visible name label
    let biggest: Ring = [];
    for (const poly of polys) if ((poly[0] as Ring).length > biggest.length) biggest = poly[0] as Ring;
    if (biggest.length) {
      let cx = 0, cy = 0;
      for (const [lng, lat] of biggest) { cx += lng; cy += lat; }
      const [x, y] = project(cx / biggest.length, cy / biggest.length);
      upazillaLabelData.push({ x, y, name });
    }
  }

  // Customer points — sized by caseQty, richer tooltip
  const maxCases = Math.max(1, ...customers.map((c) => c.caseQty));
  const customerDots = customers.map((c) => {
    const [x, y] = project(c.longitude!, c.latitude!);
    const color = REGION_COLORS[c.regionName] ?? FALLBACK_COLOR;
    const r = radiusForCases(c.caseQty, maxCases);
    const details = [
      `DB: ${c.dbName}`,
      c.dbCode ? `DB Code: ${c.dbCode}` : null,
      c.masterId ? `Master ID: ${c.masterId}` : null,
      c.areaName ? `Area: ${c.areaName}` : null,
      c.seArea ? `SE Area: ${c.seArea}` : null,
      `Region: ${c.regionName}`,
      c.address ? `Address: ${c.address}` : null,
      c.assignedRbu ? `Assigned RBU: ${c.assignedRbu.name}` : null,
      `Cases: ${c.caseQty}`,
    ]
      .filter(Boolean)
      .join(" | ");
    return `  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" fill-opacity="0.75" stroke="#ffffff" stroke-width="0.6"><title>${esc(details)}</title></circle>`;
  });

  // RBU / Factory markers
  const rbuMarks = rbus.map((r) => {
    const [x, y] = project(r.longitude, r.latitude);
    if (r.isFactory) {
      return `  <g><rect x="${(x - 7).toFixed(1)}" y="${(y - 7).toFixed(1)}" width="14" height="14" fill="#111827" stroke="#ffffff" stroke-width="1.5" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})"/><title>${esc(r.name)}</title></g>`;
    }
    return `  <g><rect x="${(x - 6).toFixed(1)}" y="${(y - 6).toFixed(1)}" width="12" height="12" rx="2" fill="#f97316" stroke="#ffffff" stroke-width="1.5"/><title>${esc(r.name)}</title></g>`;
  });

  // Shared collision boxes for all map text (city + upazilla + customer labels)
  const occupiedRects: { x1: number; y1: number; x2: number; y2: number }[] = [];
  function overlaps(rect: typeof occupiedRects[0]) {
    return occupiedRects.some(
      (r) => !(rect.x2 < r.x1 || rect.x1 > r.x2 || rect.y2 < r.y1 || rect.y1 > r.y2)
    );
  }

  // --- City / town reference locations (like a printed map) ---
  const cityMarks: string[] = [];
  for (const city of CITIES) {
    if (city.lng < minLng || city.lng > maxLng || city.lat < minLat || city.lat > maxLat) continue;
    const [x, y] = project(city.lng, city.lat);
    const fs = city.major ? 17 : 12;
    const dotR = city.major ? 4.5 : 3;
    const tw = city.name.length * fs * 0.55;
    cityMarks.push(
      `  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${dotR}" fill="#475569" stroke="#ffffff" stroke-width="1"/>`,
      `  <text x="${(x + dotR + 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="${fs}" font-family="sans-serif" font-style="italic" ${city.major ? 'font-weight="bold"' : ""} fill="#475569" opacity="0.85">${esc(city.name)}</text>`
    );
    occupiedRects.push({ x1: x + dotR + 2, y1: y - 4 - fs + 1, x2: x + dotR + 4 + tw + 2, y2: y - 2 });
  }

  // --- Visible upazilla / thana name labels (skip if they would overlap) ---
  const UPAZ_FONT = 9;
  const UPAZ_H = UPAZ_FONT + 3;
  for (const { x, y, name } of upazillaLabelData) {
    const tw = name.length * UPAZ_FONT * 0.55;
    const rect = { x1: x - tw / 2 - 2, y1: y - UPAZ_H + 1, x2: x + tw / 2 + 2, y2: y + 1 };
    if (overlaps(rect)) continue;
    occupiedRects.push(rect);
    divisionPaths.push(
      `  <text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-size="${UPAZ_FONT}" fill="#94a3b8" text-anchor="middle" font-family="sans-serif" opacity="0.85">${esc(name)}</text>`
    );
  }

  function truncate(str: string, n: number): string {
    return str.length > n ? str.slice(0, n - 1) + "…" : str;
  }

  // --- Per-point labels with collision avoidance + leader lines ---
  const FONT_SIZE = 11;
  const LABEL_H = FONT_SIZE + 4;

  const customerLabels: string[] = [];
  const sortedByQty = customers
    .map((c) => ({ c, xy: project(c.longitude!, c.latitude!) }))
    .sort((a, b) => b.c.caseQty - a.c.caseQty);

  // Reserve space under each dot so labels don't cover other points.
  for (const { c, xy } of sortedByQty) {
    const r = radiusForCases(c.caseQty, maxCases);
    occupiedRects.push({ x1: xy[0] - r, y1: xy[1] - r, x2: xy[0] + r, y2: xy[1] + r });
  }

  for (const { c, xy } of sortedByQty) {
    const [x, y] = xy;
    const r = radiusForCases(c.caseQty, maxCases);
    const rawText = `${truncate(c.dbName, 30)} (${Math.round(c.caseQty)})`;
    const text = esc(rawText);
    const tw = rawText.length * FONT_SIZE * 0.55;

    // Radial candidate positions at growing distances (8 directions per ring).
    type Cand = { lx: number; ly: number; anchor: string; dist: number };
    const candidates: Cand[] = [];
    const dirs: [number, number][] = [];
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * 2 * Math.PI;
      dirs.push([Math.cos(a), Math.sin(a)]);
    }
    for (const dist of [r + 4, r + 22, r + 44, r + 70, r + 100, r + 140, r + 190, r + 250, r + 320, r + 400]) {
      for (const [dx, dy] of dirs) {
        candidates.push({
          lx: x + dx * dist,
          ly: y + dy * dist + (dy === 0 ? 4 : dy > 0 ? LABEL_H : 0),
          anchor: dx > 0.1 ? "start" : dx < -0.1 ? "end" : "middle",
          dist,
        });
      }
    }

    for (const pos of candidates) {
      const rect = { x1: pos.lx - 2, y1: pos.ly - LABEL_H + 2, x2: pos.lx + tw + 2, y2: pos.ly + 3 };
      if (pos.anchor === "end") { rect.x1 = pos.lx - tw - 2; rect.x2 = pos.lx + 2; }
      if (pos.anchor === "middle") { rect.x1 = pos.lx - tw / 2 - 2; rect.x2 = pos.lx + tw / 2 + 2; }
      if (rect.x1 < 0 || rect.x2 > WIDTH || rect.y1 < 0) continue;
      if (overlaps(rect)) continue;
      occupiedRects.push(rect);
      if (pos.dist > r + 12) {
        const ax = pos.anchor === "end" ? rect.x2 : pos.anchor === "middle" ? pos.lx : rect.x1;
        customerLabels.push(
          `  <line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${(pos.ly - 4).toFixed(1)}" stroke="#94a3b8" stroke-width="0.7" opacity="0.8"/>`
        );
      }
      customerLabels.push(
        `  <text x="${pos.lx.toFixed(1)}" y="${pos.ly.toFixed(1)}" font-size="${FONT_SIZE}" font-family="sans-serif" fill="#1e293b" text-anchor="${pos.anchor}">${text}</text>`
      );
      break;
    }
  }

  // Legend
  const regions = Array.from(new Set(customers.map((c) => c.regionName))).sort();
  const legendItems: string[] = [];
  const sizeLegendRows = 5;
  const legendBoxH = (regions.length + 2 + sizeLegendRows) * 20 + 55;
  let ly = height - 30 - legendBoxH + 35;
  legendItems.push(`  <rect x="${WIDTH - 230}" y="${ly - 25}" width="215" height="${legendBoxH}" fill="#ffffff" fill-opacity="0.9" stroke="#cbd5e1" rx="6"/>`);
  legendItems.push(`  <text x="${WIDTH - 218}" y="${ly - 5}" font-size="13" font-weight="bold" font-family="sans-serif" fill="#0f172a">Legend</text>`);
  for (const region of regions) {
    ly += 20;
    legendItems.push(`  <circle cx="${WIDTH - 210}" cy="${ly - 4}" r="5" fill="${REGION_COLORS[region] ?? FALLBACK_COLOR}"/>`);
    legendItems.push(`  <text x="${WIDTH - 198}" y="${ly}" font-size="12" font-family="sans-serif" fill="#334155">${esc(region)} (${customers.filter((c) => c.regionName === region).length})</text>`);
  }
  ly += 20;
  legendItems.push(`  <rect x="${WIDTH - 216}" y="${ly - 10}" width="12" height="12" rx="2" fill="#f97316"/>`);
  legendItems.push(`  <text x="${WIDTH - 198}" y="${ly}" font-size="12" font-family="sans-serif" fill="#334155">RBU</text>`);
  ly += 20;
  legendItems.push(`  <rect x="${WIDTH - 215}" y="${ly - 9}" width="10" height="10" fill="#111827" transform="rotate(45 ${WIDTH - 210} ${ly - 4})"/>`);
  legendItems.push(`  <text x="${WIDTH - 198}" y="${ly}" font-size="12" font-family="sans-serif" fill="#334155">Factory</text>`);

  // Size legend (point size ∝ case quantity)
  const sortedCases = [...customers.map((c) => c.caseQty)].sort((a, b) => a - b);
  const sizeTicks = [
    { label: `Min (${Math.round(sortedCases[0])})`, qty: sortedCases[0] },
    { label: `P25 (${Math.round(sortedCases[Math.floor(sortedCases.length * 0.25)])})`, qty: sortedCases[Math.floor(sortedCases.length * 0.25)] },
    { label: `Median (${Math.round(sortedCases[Math.floor(sortedCases.length * 0.5)])})`, qty: sortedCases[Math.floor(sortedCases.length * 0.5)] },
    { label: `P75 (${Math.round(sortedCases[Math.floor(sortedCases.length * 0.75)])})`, qty: sortedCases[Math.floor(sortedCases.length * 0.75)] },
    { label: `Max (${Math.round(sortedCases[sortedCases.length - 1])})`, qty: sortedCases[sortedCases.length - 1] },
  ];
  ly += 26;
  legendItems.push(`  <text x="${WIDTH - 218}" y="${ly}" font-size="11" font-weight="bold" font-family="sans-serif" fill="#0f172a">Point size = case qty</text>`);
  for (const tick of sizeTicks) {
    ly += 18;
    const r = radiusForCases(tick.qty, maxCases);
    legendItems.push(`  <circle cx="${WIDTH - 210}" cy="${ly - 4}" r="${r.toFixed(1)}" fill="#94a3b8" fill-opacity="0.6" stroke="#ffffff" stroke-width="0.5"/>`);
    legendItems.push(`  <text x="${WIDTH - 198}" y="${ly}" font-size="11" font-family="sans-serif" fill="#334155">${esc(tick.label)}</text>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
  <rect width="${WIDTH}" height="${height}" fill="#e0f2fe"/>
  <text x="${PADDING}" y="${PADDING - 30}" font-size="32" font-weight="bold" font-family="sans-serif" fill="#0f172a">Bangladesh — PET Collection Points (${customers.length} customers, ${rbus.length} RBUs/Factory)</text>
  <text x="${PADDING}" y="${PADDING - 6}" font-size="15" font-family="sans-serif" fill="#475569">Upazilla / thana boundaries and names shown. Hover a boundary for its full name. Every point is labelled with DB name and case qty; hover points for DB code, master ID, area, SE area, address and assigned RBU.</text>
${divisionPaths.join("\n")}
${cityMarks.join("\n")}
${customerDots.join("\n")}
${rbuMarks.join("\n")}
${customerLabels.join("\n")}
${legendItems.join("\n")}
</svg>
`;

  const outPath = path.resolve(__dirname, "..", "public", "bangladesh-map.svg");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, svg, "utf8");
  console.log(`Wrote ${outPath} (${customers.length} customer points, ${rbus.length} RBU/Factory markers)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
