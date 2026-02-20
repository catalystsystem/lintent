import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  COIN_FILLER,
  INPUT_SETTLER_ESCROW_LIFI,
  MULTICHAIN_INPUT_SETTLER_ESCROW,
} from "../constants";
import type { IntentDeps } from "../deps";
import {
  CHAIN_ID_ARBITRUM,
  CHAIN_ID_BASE,
  CHAIN_ID_ETHEREUM,
  TEST_NOW_SECONDS,
  TEST_POLYMER_ORACLE,
  TEST_USER,
} from "../../tests/orderFixtures";
import type {
  CoreToken,
  CreateIntentOptionsEscrow,
  TokenContext,
} from "../types";
import { Intent } from "./create";
import { MultichainOrderIntent } from "./multichain";
import { StandardOrderIntent } from "./standard";

const originalDateNow = Date.now;
const originalMathRandom = Math.random;

const intentDeps: IntentDeps = {
  getOracle(verifier, chainId) {
    if (verifier !== "polymer") return undefined;
    return [CHAIN_ID_ETHEREUM, CHAIN_ID_ARBITRUM, CHAIN_ID_BASE].includes(
      chainId,
    )
      ? TEST_POLYMER_ORACLE
      : undefined;
  },
};

const ETH_USDC: CoreToken = {
  address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  name: "usdc",
  chainId: CHAIN_ID_ETHEREUM,
  decimals: 6,
};

const ETH_WETH: CoreToken = {
  address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  name: "weth",
  chainId: CHAIN_ID_ETHEREUM,
  decimals: 18,
};

const ARB_USDC: CoreToken = {
  address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  name: "usdc",
  chainId: CHAIN_ID_ARBITRUM,
  decimals: 6,
};

const BASE_USDC: CoreToken = {
  address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  name: "usdc",
  chainId: CHAIN_ID_BASE,
  decimals: 6,
};

function ctx(token: CoreToken, amount: bigint): TokenContext {
  return { token, amount };
}

function makeEscrowOptions(
  inputTokens: TokenContext[],
  outputTokens: TokenContext[],
): CreateIntentOptionsEscrow {
  return {
    exclusiveFor: TEST_USER,
    inputTokens,
    outputTokens,
    verifier: "polymer",
    account: () => TEST_USER,
    lock: { type: "escrow" },
  };
}

describe("Intent", () => {
  beforeEach(() => {
    Date.now = () => TEST_NOW_SECONDS * 1000;
    Math.random = () => 0.5;
  });

  afterEach(() => {
    Date.now = originalDateNow;
    Math.random = originalMathRandom;
  });

  it("counts unique input chains and detects multichain", () => {
    const intent = new Intent(
      makeEscrowOptions(
        [ctx(ETH_USDC, 10n), ctx(ETH_WETH, 1n), ctx(ARB_USDC, 20n)],
        [ctx(BASE_USDC, 10n)],
      ),
      intentDeps,
    );

    expect(intent.numInputChains()).toBe(2);
    expect(intent.isMultichain()).toBe(true);
  });

  it("detects same-chain when single input and output chains match", () => {
    const intent = new Intent(
      makeEscrowOptions([ctx(ETH_USDC, 10n)], [ctx(ETH_WETH, 1n)]),
      intentDeps,
    );

    expect(intent.isMultichain()).toBe(false);
    expect(intent.isSameChain()).toBe(true);
  });

  it("builds a single-chain intent with default deadlines and same-chain oracle", () => {
    const intent = new Intent(
      makeEscrowOptions([ctx(ETH_USDC, 10n)], [ctx(ETH_WETH, 1n)]),
      intentDeps,
    );
    const single = intent.singlechain();
    const order = single.asOrder();

    expect(single).toBeInstanceOf(StandardOrderIntent);
    expect(single.inputSettler).toBe(INPUT_SETTLER_ESCROW_LIFI);
    expect(order.inputOracle).toBe(COIN_FILLER);
    expect(order.fillDeadline).toBe(TEST_NOW_SECONDS + 2 * 60 * 60);
    expect(order.expires).toBe(TEST_NOW_SECONDS + 24 * 60 * 60);
    expect(order.nonce).toBe(2_147_483_648n);
    expect(intent.nonce()).toBe(2_147_483_648n);
  });

  it("throws when singlechain() is called for multichain input set", () => {
    const intent = new Intent(
      makeEscrowOptions(
        [ctx(ETH_USDC, 10n), ctx(ARB_USDC, 20n)],
        [ctx(BASE_USDC, 10n)],
      ),
      intentDeps,
    );

    expect(() => intent.singlechain()).toThrow("Not supported as single chain");
  });

  it("builds multichain orders grouped by chain", () => {
    const intent = new Intent(
      makeEscrowOptions(
        [ctx(ETH_USDC, 10n), ctx(ETH_WETH, 2n), ctx(ARB_USDC, 20n)],
        [ctx(BASE_USDC, 10n)],
      ),
      intentDeps,
    );
    const multi = intent.multichain();
    const order = multi.asOrder();

    expect(multi).toBeInstanceOf(MultichainOrderIntent);
    expect(multi.inputSettler).toBe(MULTICHAIN_INPUT_SETTLER_ESCROW);
    expect(order.inputs.length).toBe(2);
    expect(order.inputs[0].inputs.length).toBe(2);
    expect(order.inputs[1].inputs.length).toBe(1);
  });

  it("order() dispatches to singlechain or multichain intent", () => {
    const single = new Intent(
      makeEscrowOptions([ctx(ETH_USDC, 1n)], [ctx(ETH_WETH, 1n)]),
      intentDeps,
    ).order();
    const multi = new Intent(
      makeEscrowOptions(
        [ctx(ETH_USDC, 1n), ctx(ARB_USDC, 1n)],
        [ctx(BASE_USDC, 1n)],
      ),
      intentDeps,
    ).order();

    expect(single).toBeInstanceOf(StandardOrderIntent);
    expect(multi).toBeInstanceOf(MultichainOrderIntent);
  });
});
