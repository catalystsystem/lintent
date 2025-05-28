export type Quote = {
	fromAsset: string;
	toAsset: string;
	fromPrice: string;
	toPrice: string;
	intermediary: string;
	discount?: string;
};

export type MandateOutput = {
	remoteOracle: `0x${string}`;
	remoteFiller: `0x${string}`;
	chainId: bigint;
	token: `0x${string}`;
	amount: bigint;
	recipient: `0x${string}`;
	remoteCall: `0x${string}`;
	fulfillmentContext: `0x${string}`;
};

export type StandardOrder = {
	user: `0x${string}`;
	nonce: bigint;
	originChainId: bigint;
	expires: number;
	fillDeadline: number;
	localOracle: `0x${string}`;
	inputs: [bigint, bigint][];
	outputs: MandateOutput[];
};

export type CompactMandate = {
	fillDeadline: number;
	localOracle: `0x${string}`;
	outputs: MandateOutput[];
};

export type BatchCompact = {
	arbiter: `0x${string}`; // The account tasked with verifying and submitting the claim.
	sponsor: `0x${string}`; // The account to source the tokens from.
	nonce: bigint; // A parameter to enforce replay protection, scoped to allocator.
	expires: number; // The time at which the claim expires.
	idsAndAmounts: [bigint, bigint][]; // The allocated token IDs and amounts.
	mandate: CompactMandate;
};
