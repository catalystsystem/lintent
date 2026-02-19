import { encodePacked, hashStruct, keccak256 } from "viem";
import { compactTypes } from "../../typedMessage";
import type { BatchCompact, MultichainCompact } from "../../types";

export const MULTICHAIN_COMPACT_TYPEHASH_WITH_WITNESS = keccak256(
  encodePacked(
    ["string"],
    [
      "MultichainCompact(address sponsor,uint256 nonce,uint256 expires,Element[] elements)Element(address arbiter,uint256 chainId,Lock[] commitments,Mandate mandate)Lock(bytes12 lockTag,address token,uint256 amount)Mandate(uint32 fillDeadline,address inputOracle,MandateOutput[] outputs)MandateOutput(bytes32 oracle,bytes32 settler,uint256 chainId,bytes32 token,uint256 amount,bytes32 recipient,bytes callbackData,bytes context)",
    ],
  ),
);

export function compactClaimHash(batchCompact: BatchCompact): `0x${string}` {
  return hashStruct({
    data: batchCompact,
    types: compactTypes,
    primaryType: "BatchCompact",
  });
}

export function multichainCompactClaimHash(
  multichainCompact: MultichainCompact,
): `0x${string}` {
  return hashStruct({
    data: multichainCompact,
    types: compactTypes,
    primaryType: "MultichainCompact",
  });
}
