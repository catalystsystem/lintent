
export function compactDomain(chainId: number) {
    return {
        name: 'Ether Mail',
        version: '1',
        chainId,
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    } as const;
};

const BatchCompact = [
    { name: 'arbiter', type: 'string' },
    { name: 'sponsor', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expires', type: 'uint256' },
    { name: 'idsAndAmounts', type: 'uint256[2][]' },
    { name: 'mandate', type: 'Mandate' },
];

const Mandate = [
    { name: 'fillDeadline', type: 'uint32' },
    { name: 'localOracle', type: 'address' },
    { name: 'outputs', type: 'MandateOutput[]' },
];

const MandateOutput = [
    { name: 'remoteOracle', type: 'bytes32' },
    { name: 'remoteFiller', type: 'bytes32' },
    { name: 'chainId', type: 'uint256' },
    { name: 'token', type: 'bytes32' },
    { name: 'amount', type: 'uint256' },
    { name: 'recipient', type: 'bytes32' },
    { name: 'remoteCall', type: 'bytes' },
    { name: 'fulfillmentContext', type: 'bytes' },
];

// The named list of all type definitions
export const compactTypes = {
    BatchCompact,
    Mandate,
    MandateOutput,
} as const;