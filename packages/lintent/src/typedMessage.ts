import { keccak256, toHex } from "viem";

const BatchCompact = [
  { name: "arbiter", type: "address" },
  { name: "sponsor", type: "address" },
  { name: "nonce", type: "uint256" },
  { name: "expires", type: "uint256" },
  { name: "commitments", type: "Lock[]" },
  { name: "mandate", type: "Mandate" },
] as const;

const MultichainCompact = [
  { name: "sponsor", type: "address" },
  { name: "nonce", type: "uint256" },
  { name: "expires", type: "uint256" },
  { name: "elements", type: "Element[]" },
] as const;

const Lock = [
  { name: "lockTag", type: "bytes12" },
  { name: "token", type: "address" },
  { name: "amount", type: "uint256" },
] as const;

const Element = [
  { name: "arbiter", type: "address" },
  { name: "chainId", type: "uint256" },
  { name: "commitments", type: "Lock[]" },
  { name: "mandate", type: "Mandate" },
] as const;

const Mandate = [
  { name: "fillDeadline", type: "uint32" },
  { name: "inputOracle", type: "address" },
  { name: "outputs", type: "MandateOutput[]" },
] as const;

export const MandateOutput = [
  { name: "oracle", type: "bytes32" },
  { name: "settler", type: "bytes32" },
  { name: "chainId", type: "uint256" },
  { name: "token", type: "bytes32" },
  { name: "amount", type: "uint256" },
  { name: "recipient", type: "bytes32" },
  { name: "callbackData", type: "bytes" },
  { name: "context", type: "bytes" },
] as const;

// The named list of all type definitions
export const compactTypes = {
  BatchCompact,
  Lock,
  Mandate,
  MandateOutput,
  Element,
  MultichainCompact,
} as const;

const compact_type =
  "BatchCompact(address arbiter,address sponsor,uint256 nonce,uint256 expires,Lock[] commitments,Mandate mandate)Lock(bytes12 lockTag,address token,uint256 amount)Mandate(uint32 fillDeadline,address inputOracle,MandateOutput[] outputs)MandateOutput(bytes32 oracle,bytes32 settler,uint256 chainId,bytes32 token,uint256 amount,bytes32 recipient,bytes callbackData,bytes context)" as const;
export const compact_type_hash = keccak256(toHex(compact_type));

const multichain_compact_type =
  "MultichainCompact(address sponsor,uint256 nonce,uint256 expires,Element[] elements)Element(address arbiter,uint256 chainId,Lock[] commitments,Mandate mandate)Lock(bytes12 lockTag,address token,uint256 amount)Mandate(uint32 fillDeadline,address inputOracle,MandateOutput[] outputs)MandateOutput(bytes32 oracle,bytes32 settler,uint256 chainId,bytes32 token,uint256 amount,bytes32 recipient,bytes callbackData,bytes context)" as const;
export const multichain_compact_type_hash = keccak256(
  toHex(multichain_compact_type),
);
