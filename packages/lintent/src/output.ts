import { encodePacked, keccak256 } from "viem";
import type { MandateOutput } from "./types";

export function getOutputHash(output: MandateOutput) {
  return keccak256(
    encodePacked(
      [
        "bytes32",
        "bytes32",
        "uint256",
        "bytes32",
        "uint256",
        "bytes32",
        "uint16",
        "bytes",
        "uint16",
        "bytes",
      ],
      [
        output.oracle,
        output.settler,
        output.chainId,
        output.token,
        output.amount,
        output.recipient,
        output.callbackData.replace("0x", "").length / 2,
        output.callbackData,
        output.context.replace("0x", "").length / 2,
        output.context,
      ],
    ),
  );
}

export function encodeMandateOutput({
  solver,
  orderId,
  timestamp,
  output,
}: Readonly<{
  solver: `0x${string}`;
  orderId: `0x${string}`;
  timestamp: number;
  output: MandateOutput;
}>) {
  return encodePacked(
    [
      "bytes32",
      "bytes32",
      "uint32",
      "bytes32",
      "uint256",
      "bytes32",
      "uint16",
      "bytes",
      "uint16",
      "bytes",
    ],
    [
      solver,
      orderId,
      timestamp,
      output.token,
      output.amount,
      output.recipient,
      output.callbackData.replace("0x", "").length / 2,
      output.callbackData,
      output.context.replace("0x", "").length / 2,
      output.context,
    ],
  );
}
