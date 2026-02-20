import { describe, expect, it } from "bun:test";
import {
  INPUT_SETTLER_COMPACT_LIFI,
  MULTICHAIN_INPUT_SETTLER_COMPACT,
} from "./constants";
import {
  compactClaimHash,
  multichainCompactClaimHash,
} from "./intent/compact/claims";
import {
  toMultichainBatchCompact,
  toStandardBatchCompact,
} from "./intent/compact/conversions";
import {
  compact_type_hash,
  compactTypes,
  multichain_compact_type_hash,
} from "./typedMessage";
import { makeMultichainOrder, makeStandardOrder } from "../tests/orderFixtures";

const HEX_32_REGEX = /^0x[0-9a-fA-F]{64}$/;
const COMPACT_TYPE_HASH_CONTRACT =
  "0x5f094e58b077a941d99d3449bd1be66fd3bc9d23ab9e4c06a8713cabc3e3b634";
const MULTICHAIN_COMPACT_TYPE_HASH_CONTRACT =
  "0x6bc0624272798c7a3ff97563d8a009ea96cffd8ea74a971b2946ca790fc50319";

describe("typedMessage", () => {
  it("exports stable 32-byte type hashes", () => {
    expect(compact_type_hash).toMatch(HEX_32_REGEX);
    expect(multichain_compact_type_hash).toMatch(HEX_32_REGEX);
  });

  it("matches contract type hashes", () => {
    expect(compact_type_hash).toBe(COMPACT_TYPE_HASH_CONTRACT);
    expect(multichain_compact_type_hash).toBe(
      MULTICHAIN_COMPACT_TYPE_HASH_CONTRACT,
    );
  });

  it("includes all expected compact type groups", () => {
    expect(Object.keys(compactTypes)).toEqual([
      "BatchCompact",
      "Lock",
      "Mandate",
      "MandateOutput",
      "Element",
      "MultichainCompact",
    ]);
  });

  it("computes deterministic compact and multichain compact claim hashes", () => {
    const batchCompact = toStandardBatchCompact(
      makeStandardOrder(),
      INPUT_SETTLER_COMPACT_LIFI,
    );
    const multichainCompact = toMultichainBatchCompact(
      makeMultichainOrder(),
      MULTICHAIN_INPUT_SETTLER_COMPACT,
    );

    const compactHash1 = compactClaimHash(batchCompact);
    const compactHash2 = compactClaimHash(batchCompact);
    const multichainHash1 = multichainCompactClaimHash(multichainCompact);
    const multichainHash2 = multichainCompactClaimHash(multichainCompact);

    expect(compactHash1).toBe(compactHash2);
    expect(multichainHash1).toBe(multichainHash2);
    expect(compactHash1).toMatch(HEX_32_REGEX);
    expect(multichainHash1).toMatch(HEX_32_REGEX);
  });
});
