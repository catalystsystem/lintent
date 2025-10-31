import { keccak256, toHex } from "viem";

const BatchCompact = [
	{ name: "arbiter", type: "address" },
	{ name: "sponsor", type: "address" },
	{ name: "nonce", type: "uint256" },
	{ name: "expires", type: "uint256" },
	{ name: "commitments", type: "Lock[]" },
	{ name: "mandate", type: "Mandate" }
];

const MultichainCompact = [
	{ name: "sponsor", type: "address" },
	{ name: "nonce", type: "uint256" },
	{ name: "expires", type: "uint256" },
	{ name: "elements", type: "Element[]" }
];

const Lock = [
	{ name: "lockTag", type: "bytes12" },
	{ name: "token", type: "address" },
	{ name: "amount", type: "uint256" }
];

const Element = [
	{ name: "arbiter", type: "address" },
	{ name: "chainId", type: "uint256" },
	{ name: "commitments", type: "Lock[]" },
	{ name: "mandate", type: "Mandate" }
];

const Mandate = [
	{ name: "fillDeadline", type: "uint32" },
	{ name: "inputOracle", type: "address" },
	{ name: "outputs", type: "MandateOutput[]" }
];

const MandateOutput = [
	{ name: "oracle", type: "bytes32" },
	{ name: "settler", type: "bytes32" },
	{ name: "chainId", type: "uint256" },
	{ name: "token", type: "bytes32" },
	{ name: "amount", type: "uint256" },
	{ name: "recipient", type: "bytes32" },
	{ name: "call", type: "bytes" },
	{ name: "context", type: "bytes" }
];

export const StandardOrderAbi = [
	{ name: "user", type: "address" },
	{ name: "nonce", type: "uint256" },
	{ name: "originChainId", type: "uint256" },
	{ name: "expires", type: "uint32" },
	{ name: "fillDeadline", type: "uint32" },
	{ name: "inputOracle", type: "address" },
	{ name: "inputs", type: "uint256[2][]" },
	{ name: "outputs", type: "tuple[]", components: MandateOutput }
];

// The named list of all type definitions
export const compactTypes = {
	BatchCompact,
	Lock,
	Mandate,
	MandateOutput,
	Element,
	MultichainCompact
} as const;

const compact_type =
	"BatchCompact(address arbiter,address sponsor,uint256 nonce,uint256 expires,Lock[] commitments,Mandate mandate)Lock(bytes12 lockTag,address token,uint256 amount)Mandate(uint32 fillDeadline,address inputOracle,MandateOutput[] outputs)MandateOutput(bytes32 oracle,bytes32 settler,uint256 chainId,bytes32 token,uint256 amount,bytes32 recipient,bytes callbackData,bytes context)" as const;
export const compact_type_hash = keccak256(toHex(compact_type));
const compact_type_hash_contract =
	"0x5f094e58b077a941d99d3449bd1be66fd3bc9d23ab9e4c06a8713cabc3e3b634";
if (compact_type_hash != compact_type_hash_contract) {
	throw Error(
		`Computed typehash ${compact_type_hash} does not match expected ${compact_type_hash_contract}`
	);
}
