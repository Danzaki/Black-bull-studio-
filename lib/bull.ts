// Saitunan BULL: ka canza ƙimomin nan yadda kake so (waɗannan misalai ne).
export const BULL_COST_PER_IMAGE = 1;
export const BULL_FREE_PER_DAY = 3;

export const BULL_PACKS = [
  { id: 'starter', bull: 50, sol: 0.02 },
  { id: 'creator', bull: 200, sol: 0.06 },
  { id: 'pro', bull: 600, sol: 0.15 },
] as const;

export type BullPackId = (typeof BULL_PACKS)[number]['id'];
