export const MAX_ENERGY = 50;
export const ENERGY_REGEN_MS = 5 * 60 * 1000; // 5분당 1
export const ENERGY_COST_PLACE = 2;
export const ENERGY_COST_EDIT_SESSION = 3;
export const ENERGY_REWARD_MISSION = 5;
export const ENERGY_REWARD_AD = 10;

export function regenEnergy(
  current: number,
  max: number,
  lastTick: string | null,
  now = Date.now()
): { energy: number; lastTick: string } {
  const cap = Math.max(1, max);
  let energy = Math.min(cap, Math.max(0, current));
  const base = lastTick ? Date.parse(lastTick) : now;
  if (Number.isNaN(base) || energy >= cap) {
    return { energy, lastTick: new Date(now).toISOString() };
  }
  const elapsed = Math.max(0, now - base);
  const gained = Math.floor(elapsed / ENERGY_REGEN_MS);
  if (gained <= 0) return { energy, lastTick: new Date(base).toISOString() };
  energy = Math.min(cap, energy + gained);
  const advanced = base + gained * ENERGY_REGEN_MS;
  return { energy, lastTick: new Date(advanced).toISOString() };
}

export function canSpendEnergy(energy: number, cost: number) {
  return energy >= cost;
}

export function spendEnergy(energy: number, cost: number) {
  return Math.max(0, energy - cost);
}

export function energyRegenLabel(lastTick: string | null, now = Date.now()): string | null {
  if (!lastTick) return null;
  const base = Date.parse(lastTick);
  if (Number.isNaN(base)) return null;
  const remain = ENERGY_REGEN_MS - ((now - base) % ENERGY_REGEN_MS);
  if (remain <= 0) return null;
  const min = Math.ceil(remain / 60000);
  return `${min}분 후 +1`;
}
