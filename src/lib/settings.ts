import { prisma } from "./prisma";

export interface AppSettings {
  lowVolumeThresholdCases: number;
  clusterRadiusKm: number;
}

/**
 * Always reads settings live from the DB (single "singleton" row).
 * Every low-volume / clustering decision must call this, not a constant.
 */
export async function getSettings(): Promise<AppSettings> {
  const row = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return {
    lowVolumeThresholdCases: row.lowVolumeThresholdCases,
    clusterRadiusKm: row.clusterRadiusKm,
  };
}
