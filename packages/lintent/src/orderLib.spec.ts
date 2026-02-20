import { describe, expect, it } from "bun:test";
import {
  COIN_FILLER,
  INPUT_SETTLER_COMPACT_LIFI,
  INPUT_SETTLER_ESCROW_LIFI,
  MULTICHAIN_INPUT_SETTLER_ESCROW,
} from "./constants";
import type { OrderContainerValidationDeps } from "./deps";
import {
  validateOrder,
  validateOrderContainer,
  validateOrderContainerWithReason,
  validateOrderWithReason,
  VALIDATION_ERRORS,
} from "./validation";
import { encodeMandateOutput, getOutputHash } from "./output";
import type { OrderContainer } from "./types";
import {
  b32,
  CHAIN_ID_ARBITRUM,
  CHAIN_ID_ETHEREUM,
  makeMandateOutput,
  makeMultichainOrder,
  makeStandardOrder,
} from "../tests/orderFixtures";

const output = makeMandateOutput(CHAIN_ID_ARBITRUM, 1n, { context: "0x00" });

const validationDeps: OrderContainerValidationDeps = {
  inputSettlers: [INPUT_SETTLER_COMPACT_LIFI],
  allowedInputOracles({ chainId, sameChainFill }) {
    if (chainId !== CHAIN_ID_ETHEREUM) return undefined;
    const allowed = [
      "0x0000003E06000007A224AeE90052fA6bb46d43C9" as `0x${string}`,
    ];
    if (sameChainFill) allowed.push(COIN_FILLER);
    return allowed;
  },
  allowedOutputOracles(chainId) {
    if (chainId !== CHAIN_ID_ARBITRUM && chainId !== CHAIN_ID_ETHEREUM)
      return undefined;
    return ["0x0000003E06000007A224AeE90052fA6bb46d43C9"];
  },
  allowedOutputSettlers() {
    return [COIN_FILLER];
  },
};

describe("orderLib", () => {
  it("produces stable output hashes", () => {
    const h1 = getOutputHash(output);
    const h2 = getOutputHash(output);
    expect(h1).toBe(h2);
  });

  it("changes hash when output amount changes", () => {
    const h1 = getOutputHash(output);
    const h2 = getOutputHash({ ...output, amount: output.amount + 1n });
    expect(h1).not.toBe(h2);
  });

  it("rejects orders where fillDeadline is later than expires", () => {
    const invalidTiming = makeStandardOrder({
      expires: 2_000_000_000,
      fillDeadline: 2_000_000_001,
    });
    const result = validateOrderWithReason({
      order: invalidTiming,
      deps: validationDeps,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(VALIDATION_ERRORS.FILL_DEADLINE_AFTER_EXPIRES);
  });

  it("accepts orders with multiple outputs", () => {
    const multiOutput = makeStandardOrder({
      outputs: [output, { ...output, amount: 2n }],
    });
    expect(validateOrder({ order: multiOutput, deps: validationDeps })).toBe(
      true,
    );
  });

  it("rejects orders with unknown source oracle", () => {
    const invalidOracle = makeStandardOrder({
      inputOracle: "0x0000000000000000000000000000000000000001",
    });
    const result = validateOrderWithReason({
      order: invalidOracle,
      deps: validationDeps,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(VALIDATION_ERRORS.INPUT_ORACLE_NOT_ALLOWED);
  });

  it("accepts same-chain intents with COIN_FILLER as inputOracle", () => {
    const sameChainCoinFiller = makeStandardOrder({
      inputOracle: COIN_FILLER,
      outputs: [{ ...output, chainId: CHAIN_ID_ETHEREUM }],
    });
    expect(
      validateOrder({ order: sameChainCoinFiller, deps: validationDeps }),
    ).toBe(true);
  });

  it("rejects orders with empty inputs", () => {
    const emptyInputs = makeStandardOrder({ inputs: [] });
    const result = validateOrderWithReason({
      order: emptyInputs,
      deps: validationDeps,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(VALIDATION_ERRORS.NO_INPUTS);
  });

  it("rejects orders with non-positive input amount", () => {
    const invalidInputAmount = makeStandardOrder({ inputs: [[1n, 0n]] });
    const result = validateOrderWithReason({
      order: invalidInputAmount,
      deps: validationDeps,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(VALIDATION_ERRORS.INPUT_AMOUNT_NON_POSITIVE);
  });

  it("accepts orders with zero output amount", () => {
    const zeroOutputAmount = makeStandardOrder({
      outputs: [{ ...output, amount: 0n }],
    });
    expect(
      validateOrder({ order: zeroOutputAmount, deps: validationDeps }),
    ).toBe(true);
  });

  it("rejects orders with negative output amount", () => {
    const negativeOutputAmount = makeStandardOrder({
      outputs: [{ ...output, amount: -1n }],
    });
    const result = validateOrderWithReason({
      order: negativeOutputAmount,
      deps: validationDeps,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(VALIDATION_ERRORS.OUTPUT_AMOUNT_NON_POSITIVE);
  });

  it("rejects orders with unknown output chain", () => {
    const badOutputChain = makeStandardOrder({
      outputs: [{ ...output, chainId: 999999999n }],
    });
    const result = validateOrderWithReason({
      order: badOutputChain,
      deps: validationDeps,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(VALIDATION_ERRORS.UNKNOWN_OUTPUT_CHAIN);
  });

  it("rejects orders with non-whitelisted output oracle", () => {
    const badOutputOracle = makeStandardOrder({
      outputs: [{ ...output, oracle: b32("a") }],
    });
    const result = validateOrderWithReason({
      order: badOutputOracle,
      deps: validationDeps,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(VALIDATION_ERRORS.INVALID_OUTPUT_ORACLE);
  });

  it("rejects orders with non-whitelisted output settler", () => {
    const badOutputSettler = makeStandardOrder({
      outputs: [{ ...output, settler: b32("b") }],
    });
    const result = validateOrderWithReason({
      order: badOutputSettler,
      deps: validationDeps,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(VALIDATION_ERRORS.INVALID_OUTPUT_SETTLER);
  });

  it("rejects orders with zero token", () => {
    const invalidToken = makeStandardOrder({
      outputs: [{ ...output, token: b32("0") }],
    });
    const result = validateOrderWithReason({
      order: invalidToken,
      deps: validationDeps,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(VALIDATION_ERRORS.OUTPUT_TOKEN_ZERO);
  });

  it("rejects orders with zero recipient", () => {
    const invalidRecipient = makeStandardOrder({
      outputs: [{ ...output, recipient: b32("0") }],
    });
    const result = validateOrderWithReason({
      order: invalidRecipient,
      deps: validationDeps,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(VALIDATION_ERRORS.OUTPUT_RECIPIENT_ZERO);
  });

  it("returns standard-order validation result from container validator", () => {
    const invalidStandardContainer: OrderContainer = {
      inputSettler: INPUT_SETTLER_ESCROW_LIFI,
      order: makeStandardOrder({
        inputOracle: "0x0000000000000000000000000000000000000001",
      }),
      sponsorSignature: { type: "None", payload: "0x" },
      allocatorSignature: { type: "None", payload: "0x" },
    };

    const result = validateOrderContainerWithReason({
      orderContainer: invalidStandardContainer,
      deps: validationDeps,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toBe(VALIDATION_ERRORS.INPUT_ORACLE_NOT_ALLOWED);
  });

  it("accepts multichain containers in TODO validation path", () => {
    const multichainContainer: OrderContainer = {
      inputSettler: MULTICHAIN_INPUT_SETTLER_ESCROW,
      order: makeMultichainOrder(),
      sponsorSignature: { type: "None", payload: "0x" },
      allocatorSignature: { type: "None", payload: "0x" },
    };
    expect(
      validateOrderContainer({
        orderContainer: multichainContainer,
        deps: validationDeps,
      }),
    ).toBe(true);
  });

  it("treats compact intents as valid in container validator (TODO path)", () => {
    const compactContainer: OrderContainer = {
      inputSettler: INPUT_SETTLER_COMPACT_LIFI,
      order: makeStandardOrder({
        inputOracle: "0x0000000000000000000000000000000000000001",
      }),
      sponsorSignature: { type: "None", payload: "0x" },
      allocatorSignature: { type: "None", payload: "0x" },
    };
    expect(
      validateOrderContainer({
        orderContainer: compactContainer,
        deps: validationDeps,
      }),
    ).toBe(true);
  });

  it("encodes mandate output deterministically", () => {
    const solver = b32("1");
    const orderId = b32("2");
    const encoded1 = encodeMandateOutput({
      solver,
      orderId,
      timestamp: 1234,
      output,
    });
    const encoded2 = encodeMandateOutput({
      solver,
      orderId,
      timestamp: 1234,
      output,
    });

    expect(encoded1).toBe(encoded2);
    expect(encoded1.startsWith("0x")).toBe(true);
  });
});
