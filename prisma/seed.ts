import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Pre-filled but editable seed RBUs + Factory (see build prompt §4.2).
// Two RBU locations were not provided — BPCL admin adds them in the UI.
const RBUS = [
  {
    name: "RBU — Bayazid, Chattogram",
    latitude: 22.3874967,
    longitude: 91.8092229,
    address: "Bayazid, Chattogram",
    capacityNotes: "Exact pin resolved from Maps link.",
    isFactory: false,
  },
  {
    name: "RBU — Mizmizi, Narayanganj",
    latitude: 23.63,
    longitude: 90.51,
    address: "Mizmizi, Narayanganj",
    capacityNotes: "Approximate — re-pin exact location in-app.",
    isFactory: false,
  },
  {
    name: "RBU — Cumilla (Kangshanagar)",
    latitude: 23.46,
    longitude: 91.18,
    address: "Comilla–Sylhet Hwy, Kangshanagar, Cumilla",
    capacityNotes: "Approximate — re-pin exact location in-app.",
    isFactory: false,
  },
  {
    name: "RBU — Bogura",
    latitude: 24.88389843028668,
    longitude: 89.35436961465572,
    address: "Bogura",
    capacityNotes: "Approximate — re-pin exact location in-app.",
    isFactory: false,
  },
  {
    name: "RBU — Coxbazar",
    latitude: 21.43349651753353,
    longitude: 92.03417264417608,
    address: "Cox's Bazar",
    capacityNotes: "Approximate — re-pin exact location in-app.",
    isFactory: false,
  },
  {
    name: "BPCL Factory — Murapara, Rupganj",
    latitude: 23.79,
    longitude: 90.55,
    address: "Fakirer Darga, Murapara, Rupganj, Narayanganj",
    capacityNotes: "Final destination. Approximate — re-pin exact location in-app.",
    isFactory: true,
  },
];

const USERS = [
  { email: "transcom@demo.com", name: "Transcom Admin", role: "TRANSCOM_ADMIN" },
  { email: "bpcl@demo.com", name: "BPCL Admin", role: "BPCL_ADMIN" },
  { email: "viewer@demo.com", name: "Viewer", role: "VIEWER" },
];

async function main() {
  // Settings singleton
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", lowVolumeThresholdCases: 300, clusterRadiusKm: 15 },
  });

  // Users (default password: password123)
  const hash = await bcrypt.hash("password123", 10);
  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { email: u.email, name: u.name, role: u.role, password: hash },
    });
  }

  // RBUs + Factory (only seed if none exist yet, to avoid duplicating edited pins)
  const existing = await prisma.rbu.count();
  if (existing === 0) {
    for (const r of RBUS) {
      await prisma.rbu.create({ data: r });
    }
    console.log(`Seeded ${RBUS.length} RBUs/Factory.`);
  } else {
    console.log(`RBUs already present (${existing}) — skipping RBU seed.`);
  }

  console.log("Seed complete. Logins: transcom@demo.com / bpcl@demo.com / viewer@demo.com (password123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
