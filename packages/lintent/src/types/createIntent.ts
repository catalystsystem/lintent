import type { CoreVerifier } from "../deps";
import type { CompactLock, EscrowLock } from "./lock";
import type { TokenContext } from "./token";

export type CreateIntentOptionsEscrow = {
  exclusiveFor: string;
  inputTokens: TokenContext[];
  outputTokens: TokenContext[];
  verifier: CoreVerifier;
  account: () => `0x${string}`;
  lock: EscrowLock;
};

export type CreateIntentOptionsCompact = {
  exclusiveFor: string;
  inputTokens: TokenContext[];
  outputTokens: TokenContext[];
  verifier: CoreVerifier;
  account: () => `0x${string}`;
  lock: CompactLock;
};

export type CreateIntentOptions =
  | CreateIntentOptionsEscrow
  | CreateIntentOptionsCompact;
