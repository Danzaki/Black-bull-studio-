export type FeePreset = "DEFAULT" | "FAST" | "TURBO" | "ULTRA" | "CUSTOM";

export interface PriorityFeeConfig {
  preset: FeePreset;
  priorityFeeSOL: number;
  jitoTipSOL: number;
  maxComputeUnits: number;
  autoFeeAdjustment: boolean;
}
