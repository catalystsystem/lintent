import type { CompactMandate } from "./mandate";
import type { Lock } from "./lock";

export type BatchCompact = {
  arbiter: `0x${string}`; // The account tasked with verifying and submitting the claim.
  sponsor: `0x${string}`; // The account to source the tokens from.
  nonce: bigint; // A parameter to enforce replay protection, scoped to allocator.
  expires: bigint; // The time at which the claim expires.
  commitments: Lock[]; // The allocated token IDs and amounts.
  mandate: CompactMandate;
};

export type Element = {
  arbiter: `0x${string}`;
  chainId: bigint;
  commitments: Lock[];
  mandate: CompactMandate;
};

export type MultichainCompact = {
  sponsor: `0x${string}`; // The account tasked with verifying and submitting the claim.
  nonce: bigint; // A parameter to enforce replay protection, scoped to allocator.
  expires: bigint; // The time at which the claim expires.
  elements: Element[];
  mandate: CompactMandate;
};
