import { encodePacked, hashTypedData, keccak256, toHex } from "viem";
import type {
  CompactMandate,
  MultichainOrder,
  MultichainOrderComponent,
} from "../../types";
import { INPUT_SETTLER_ESCROW_LIFI } from "$lib/config";
import { compactTypes } from "./typedMessage";

function selectAllBut<T>(arr: T[], index: number): T[] {
  return [...arr.slice(0, index), ...arr.slice(index + 1, arr.length)];
}

function secondariesEcsrow(
  order: MultichainOrder,
): { chainIdField: bigint; additionalChains: `0x${string}`[] }[] {
  const inputsHash: `0x${string}`[] = order.inputs.map((input) =>
    keccak256(encodePacked(
      ["uint256", "uint256[2][]"],
      [input.chainId, input.inputs],
    ))
  );
  return order.inputs.map((v, i) => {
    return {
      chainIdField: v.chainId,
      additionalChains: selectAllBut(inputsHash, i),
    };
  });
}

type Lock = {
  lockTag: `0x${string}`;
  token: `0x${string}`;
  amount: bigint;
};

function inputsToLocks(
  inputs: [bigint, bigint][],
): Lock[] {
  return inputs.map((input) => {
    const bytes32 = toHex(input[0]).replace("0x", "");
    return {
      lockTag: `0x${bytes32.slice(0, 12 * 2)}`,
      token: `0x${bytes32.slice(12 * 2, 32 * 2)}`,
      amount: input[1],
    };
  });
}

function secondariesCompact(
  order: MultichainOrder,
  inputSettler: `0x${string}`,
): { chainIdField: bigint; additionalChains: `0x${string}`[] }[] {
  const mandate: CompactMandate = {
    fillDeadline: order.fillDeadline,
    inputOracle: order.inputOracle,
    outputs: order.outputs,
  };
  const elements = order.inputs.map((inputs) => {
    const element: {
      arbiter: `0x${string}`;
      chainId: bigint;
      commitments: Lock[];
      mandate: CompactMandate;
    } = {
      arbiter: inputSettler,
      chainId: inputs.chainId,
      commitments: inputsToLocks(inputs.inputs),
      mandate,
    };
    return hashTypedData({
      types: compactTypes,
      primaryType: "Element",
      message: element,
    });
  });
  return order.inputs.map((_, i) => {
    return {
      chainIdField: order.inputs[0].chainId,
      additionalChains: selectAllBut(elements, i),
    };
  });
}

function ComponentizeOrder(
  order: MultichainOrder,
  inputSettler: `0x${string}`,
): MultichainOrderComponent[] {
  const inputs = order.inputs;
  const secondaries = inputSettler === INPUT_SETTLER_ESCROW_LIFI
    ? secondariesEcsrow(order)
    : secondariesCompact(order, inputSettler);
  const components: MultichainOrderComponent[] = [];
  for (let i = 0; i < inputs.length; ++i) {
    const { chainIdField, additionalChains } = secondaries[i];

    const orderComponent: MultichainOrderComponent = {
      user: order.user,
      nonce: order.nonce,
      chainIdField: chainIdField,
      chainIndex: BigInt(i),
      expires: order.expires,
      fillDeadline: order.fillDeadline,
      inputOracle: order.inputOracle,
      inputs: order.inputs[i].inputs,
      outputs: order.outputs,
      additionalChains: additionalChains,
    };
    components.push(orderComponent);
  }
  return components;
}
