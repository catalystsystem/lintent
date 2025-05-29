import { keccak256, toHex } from "viem";

const BatchCompact = [
    { name: "arbiter", type: "address" },
    { name: "sponsor", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "expires", type: "uint256" },
    { name: "idsAndAmounts", type: "uint256[2][]" },
    { name: "mandate", type: "Mandate" },
];

const Mandate = [
    { name: "fillDeadline", type: "uint32" },
    { name: "localOracle", type: "address" },
    { name: "outputs", type: "MandateOutput[]" },
];

const MandateOutput = [
    { name: "remoteOracle", type: "bytes32" },
    { name: "remoteFiller", type: "bytes32" },
    { name: "chainId", type: "uint256" },
    { name: "token", type: "bytes32" },
    { name: "amount", type: "uint256" },
    { name: "recipient", type: "bytes32" },
    { name: "remoteCall", type: "bytes" },
    { name: "fulfillmentContext", type: "bytes" },
];

// The named list of all type definitions
export const compactTypes = {
    BatchCompact,
    Mandate,
    MandateOutput,
} as const;

const compact_type =
    "BatchCompact(address arbiter,address sponsor,uint256 nonce,uint256 expires,uint256[2][] idsAndAmounts,Mandate mandate)Mandate(uint32 fillDeadline,address localOracle,MandateOutput[] outputs)MandateOutput(bytes32 remoteOracle,bytes32 remoteFiller,uint256 chainId,bytes32 token,uint256 amount,bytes32 recipient,bytes remoteCall,bytes fulfillmentContext)" as const;
export const compact_type_hash = keccak256(toHex(compact_type));
const compact_type_hash_contract =
    "0x3df4b6efdfbd05bc0129a40c10b9e80a519127db6100fb77877a4ac4ac191af7";
if (compact_type_hash != compact_type_hash_contract) {
    throw Error(
        `Computed typehash ${compact_type_hash} does not match expected ${compact_type_hash_contract}`,
    );
}
