import { toHex } from "viem";
import type {
  BatchCompact,
  CompactMandate,
  Element,
  Lock,
  MultichainCompact,
  MultichainOrder,
  StandardOrder,
} from "../../types";

export function tokenIdToLock(tokenId: bigint, amount: bigint): Lock {
  const bytes32 = toHex(tokenId, { size: 32 }).slice(2);
  return {
    lockTag: `0x${bytes32.slice(0, 12 * 2)}`,
    token: `0x${bytes32.slice(12 * 2, 32 * 2)}`,
    amount,
  };
}

export function inputsToLocks(inputs: [bigint, bigint][]): Lock[] {
  return inputs.map(([tokenId, amount]) => tokenIdToLock(tokenId, amount));
}

export function toStandardBatchCompact(
  order: StandardOrder,
  arbiter: `0x${string}`,
): BatchCompact {
  const mandate: CompactMandate = {
    fillDeadline: order.fillDeadline,
    inputOracle: order.inputOracle,
    outputs: order.outputs,
  };
  return {
    arbiter,
    sponsor: order.user,
    nonce: order.nonce,
    expires: BigInt(order.expires),
    commitments: inputsToLocks(order.inputs),
    mandate,
  };
}

export function toMultichainElements(
  order: MultichainOrder,
  arbiter: `0x${string}`,
): Element[] {
  const mandate: CompactMandate = {
    fillDeadline: order.fillDeadline,
    inputOracle: order.inputOracle,
    outputs: order.outputs,
  };
  return order.inputs.map((inputs) => {
    return {
      arbiter,
      chainId: inputs.chainId,
      commitments: inputsToLocks(inputs.inputs),
      mandate,
    };
  });
}

export function toMultichainBatchCompact(
  order: MultichainOrder,
  arbiter: `0x${string}`,
): MultichainCompact {
  const mandate: CompactMandate = {
    fillDeadline: order.fillDeadline,
    inputOracle: order.inputOracle,
    outputs: order.outputs,
  };
  return {
    sponsor: order.user,
    nonce: order.nonce,
    expires: BigInt(order.expires),
    elements: toMultichainElements(order, arbiter),
    mandate,
  };
}
