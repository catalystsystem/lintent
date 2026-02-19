import { encodeAbiParameters, encodePacked, parseAbiParameters } from "viem";
import { COIN_FILLER } from "../../constants";
import type { CoreVerifier, IntentDeps } from "../../deps";
import { addressToBytes32 } from "../../helpers/convert";
import type { MandateOutput, TokenContext } from "../../types";
import { ONE_MINUTE } from "./shared";

export function encodeOutputs(outputs: MandateOutput[]) {
  return encodeAbiParameters(
    parseAbiParameters(
      "(bytes32 oracle, bytes32 settler, uint256 chainId, bytes32 token, uint256 amount, bytes32 recipient, bytes callbackData, bytes context)[]",
    ),
    [outputs],
  );
}

export function buildMandateOutputs(options: {
  exclusiveFor: `0x${string}`;
  outputTokens: TokenContext[];
  getOracle: IntentDeps["getOracle"];
  verifier: CoreVerifier;
  sameChain: boolean;
  recipient: `0x${string}`;
  currentTime: number;
}): MandateOutput[] {
  const {
    exclusiveFor,
    outputTokens,
    getOracle,
    verifier,
    sameChain,
    recipient,
    currentTime,
  } = options;

  if (exclusiveFor) {
    const formattedCorrectly =
      exclusiveFor.length === 42 && exclusiveFor.slice(0, 2) === "0x";
    if (!formattedCorrectly) {
      throw new Error(`ExclusiveFor not formatted correctly ${exclusiveFor}`);
    }
  }

  let context: `0x${string}` = "0x";
  if (exclusiveFor) {
    const paddedExclusiveFor: `0x${string}` = `0x${exclusiveFor.replace("0x", "").padStart(64, "0")}`;
    context = encodePacked(
      ["bytes1", "bytes32", "uint32"],
      ["0xe0", paddedExclusiveFor, currentTime + ONE_MINUTE],
    );
  }

  const outputSettler = COIN_FILLER;
  return outputTokens.map(({ token, amount }) => {
    const outputOracle = sameChain
      ? addressToBytes32(outputSettler)
      : addressToBytes32(getOracle(verifier, token.chainId)!);
    return {
      oracle: outputOracle,
      settler: addressToBytes32(outputSettler),
      chainId: token.chainId,
      token: addressToBytes32(token.address),
      amount: amount,
      recipient: addressToBytes32(recipient),
      callbackData: "0x",
      context,
    };
  }) as MandateOutput[];
}
