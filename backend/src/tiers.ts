export type TierCode = 'UNVERIFIED' | 'VERIFIED' | 'TRUSTED' | 'ADVANCED' | 'COMMUNITY';

export interface TierConfig {
  name: string;
  tier: TierCode;
  minCycles: number;
  maxCycles: number;
  perOrder: number;
  totalCap: number;
  windowDays: number;
}

export const TIERS: TierConfig[] = [
  { name: 'Unverified', tier: 'UNVERIFIED', minCycles: 0, maxCycles: 9, perOrder: 2500, totalCap: 5000, windowDays: 7 },
  { name: 'Verified', tier: 'VERIFIED', minCycles: 10, maxCycles: 19, perOrder: 10000, totalCap: 30000, windowDays: 14 },
  { name: 'Trusted', tier: 'TRUSTED', minCycles: 20, maxCycles: 29, perOrder: 15000, totalCap: 50000, windowDays: 14 },
  { name: 'Advanced', tier: 'ADVANCED', minCycles: 30, maxCycles: 39, perOrder: 20000, totalCap: 100000, windowDays: 14 },
  { name: 'Community', tier: 'COMMUNITY', minCycles: 40, maxCycles: 999, perOrder: 25000, totalCap: 150000, windowDays: 14 },
];

export function getTierByCycles(cleanCycles: number): TierConfig {
  const cycles = Number.isFinite(cleanCycles) ? cleanCycles : 0;
  return TIERS.find(t => cycles >= t.minCycles && cycles <= t.maxCycles) ?? TIERS[TIERS.length - 1];
}

export function getNextTier(cleanCycles: number): TierConfig | null {
  const current = getTierByCycles(cleanCycles);
  const index = TIERS.findIndex(t => t.tier === current.tier);
  return index >= 0 && index < TIERS.length - 1 ? TIERS[index + 1] : null;
}

export function findTierByCode(tierCode: string): TierConfig | undefined {
  return TIERS.find(t => t.tier === tierCode.toUpperCase());
}
