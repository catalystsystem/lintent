import type { ResetPeriod } from "../compact/idLib";

export type Lock = {
  lockTag: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
};

export type EscrowLock = {
  type: "escrow";
};

export type CompactLock = {
  type: "compact";
  resetPeriod: ResetPeriod;
  allocatorId: string;
};
