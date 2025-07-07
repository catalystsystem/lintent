import { keccak256, toHex } from 'viem';

const BatchCompact = [
	{ name: 'arbiter', type: 'address' },
	{ name: 'sponsor', type: 'address' },
	{ name: 'nonce', type: 'uint256' },
	{ name: 'expires', type: 'uint256' },
	{ name: 'commitments', type: 'Lock[]' },
	{ name: 'mandate', type: 'Mandate' }
];

const Lock = [
	{ name: 'lockTag', type: 'bytes12' },
	{ name: 'token', type: 'address' },
	{ name: 'amount', type: 'uint256' }
];

const Mandate = [
	{ name: 'fillDeadline', type: 'uint32' },
	{ name: 'localOracle', type: 'address' },
	{ name: 'outputs', type: 'MandateOutput[]' }
];

const MandateOutput = [
	{ name: 'oracle', type: 'bytes32' },
	{ name: 'settler', type: 'bytes32' },
	{ name: 'chainId', type: 'uint256' },
	{ name: 'token', type: 'bytes32' },
	{ name: 'amount', type: 'uint256' },
	{ name: 'recipient', type: 'bytes32' },
	{ name: 'call', type: 'bytes' },
	{ name: 'context', type: 'bytes' }
];

// The named list of all type definitions
export const compactTypes = {
	BatchCompact,
	Lock,
	Mandate,
	MandateOutput
} as const;

const compact_type =
	'BatchCompact(address arbiter,address sponsor,uint256 nonce,uint256 expires,Lock[] commitments,Mandate mandate)Lock(bytes12 lockTag,address token,uint256 amount)Mandate(uint32 fillDeadline,address localOracle,MandateOutput[] outputs)MandateOutput(bytes32 oracle,bytes32 settler,uint256 chainId,bytes32 token,uint256 amount,bytes32 recipient,bytes call,bytes context)' as const;
export const compact_type_hash = keccak256(toHex(compact_type));
const compact_type_hash_contract =
	'0xe59b17e829b6c1c2326e294d1512ea33a89d4f69e083a36bdc2e8deca4a7ab17';
if (compact_type_hash != compact_type_hash_contract) {
	throw Error(
		`Computed typehash ${compact_type_hash} does not match expected ${compact_type_hash_contract}`
	);
}
