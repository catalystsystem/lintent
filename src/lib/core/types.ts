import type { Token, Verifier } from "../config";
import type { ResetPeriod } from "./compact/idLib";

export type Quote = {
	fromAsset: string;
	toAsset: string;
	fromPrice: string;
	toPrice: string;
	intermediary: string;
	discount?: string;
};

export type MandateOutput = {
	oracle: `0x${string}`;
	settler: `0x${string}`;
	chainId: bigint;
	token: `0x${string}`;
	amount: bigint;
	recipient: `0x${string}`;
	callbackData: `0x${string}`;
	context: `0x${string}`;
};

export type CompactMandate = {
	fillDeadline: number;
	inputOracle: `0x${string}`;
	outputs: MandateOutput[];
};

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

export type TokenContext = {
	token: Token;
	amount: bigint;
};

export type CreateIntentOptionsEscrow = {
	exclusiveFor: string;
	inputTokens: TokenContext[];
	outputTokens: TokenContext[];
	verifier: Verifier;
	account: () => `0x${string}`;
	lock: EscrowLock;
};

export type CreateIntentOptionsCompact = {
	exclusiveFor: string;
	inputTokens: TokenContext[];
	outputTokens: TokenContext[];
	verifier: Verifier;
	account: () => `0x${string}`;
	lock: CompactLock;
};

export type CreateIntentOptions = CreateIntentOptionsEscrow | CreateIntentOptionsCompact;

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

export type StandardOrder = {
	user: `0x${string}`;
	nonce: bigint;
	originChainId: bigint;
	expires: number;
	fillDeadline: number;
	inputOracle: `0x${string}`;
	inputs: [bigint, bigint][];
	outputs: MandateOutput[];
};

export type MultichainOrderComponent = {
	user: `0x${string}`;
	nonce: bigint;
	chainIdField: bigint;
	chainIndex: bigint;
	expires: number;
	fillDeadline: number;
	inputOracle: `0x${string}`;
	inputs: [bigint, bigint][];
	outputs: MandateOutput[];
	additionalChains: `0x${string}`[];
};

export type MultichainOrder = {
	user: `0x${string}`;
	nonce: bigint;
	expires: number;
	fillDeadline: number;
	inputOracle: `0x${string}`;
	outputs: MandateOutput[];
	inputs: { chainId: bigint; inputs: [bigint, bigint][] }[];
};

export type NoSignature = {
	type: "None";
	payload: "0x";
};

export type Signature = {
	type: "ECDSA" | "ERC-1271";
	payload: `0x${string}`;
};

export type OrderContainer = {
	inputSettler: `0x${string}`;
	order: StandardOrder | MultichainOrder;
	sponsorSignature: Signature | NoSignature;
	allocatorSignature: Signature | NoSignature;
};
