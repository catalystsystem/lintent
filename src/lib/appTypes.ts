import type { Token, Verifier } from "./config";
import type { CompactLock, EscrowLock } from "./core/types";

export type AppTokenContext = {
	token: Token;
	amount: bigint;
};

export type AppCreateIntentOptions = {
	exclusiveFor: string;
	inputTokens: AppTokenContext[];
	outputTokens: AppTokenContext[];
	verifier: Verifier;
	account: () => `0x${string}`;
	lock: EscrowLock | CompactLock;
};
