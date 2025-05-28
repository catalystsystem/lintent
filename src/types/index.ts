export type Quote = {
	fromAsset: string;
	toAsset: string;
	fromPrice: string;
	toPrice: string;
	intermediary: string;
	discount?: string;
};

export type MandateOutput = {
	remoteOracle: string;
	remoteFiller: string;
	chainId: number;
	token: string;
	amount: bigint;
	recipient: string;
	remoteCall: string;
	fulfillmentContext: string;
};

export type StandardOrder = {
	user: string;
	nonce: number;
	originChainId: number;
	expires: number;
	fillDeadline: number;
	localOracle: string;
	inputs: [bigint, bigint][];
	outputs: MandateOutput[];
};

export type CompactMandate = {
	fillDeadline: number;
	localOracle: string;
	outputs: MandateOutput[];
};

export type BatchCompact = {
	arbiter: string; // The account tasked with verifying and submitting the claim.
	sponsor: string; // The account to source the tokens from.
	nonce: number; // A parameter to enforce replay protection, scoped to allocator.
	expires: number; // The time at which the claim expires.
	idsAndAmounts: [bigint, bigint][]; // The allocated token IDs and amounts.
	mandate: CompactMandate;
};
