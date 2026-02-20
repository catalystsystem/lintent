import { describe, expect, it } from "bun:test";
import { INPUT_SETTLER_ESCROW_LIFI } from "../constants";
import { isStandardOrder } from "../intent";
import { parseOrderStatusPayload } from "./intentApi";

const BYTES32_ONE =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as const;
const INPUT_SETTLER = INPUT_SETTLER_ESCROW_LIFI;

describe("parseOrderStatusPayload", () => {
  it("parses a status payload into an OrderContainer", () => {
    const payload = {
      data: {
        order: {
          user: "0x1111111111111111111111111111111111111111",
          nonce: "123",
          originChainId: "8453",
          expires: Math.floor(Date.now() / 1000) + 3600,
          fillDeadline: Math.floor(Date.now() / 1000) + 1800,
          inputOracle: "0x0000000000000000000000000000000000000001",
          inputs: [["1", "1000000"]],
          outputs: [
            {
              oracle: BYTES32_ONE,
              settler: BYTES32_ONE,
              chainId: "42161",
              token: BYTES32_ONE,
              amount: "1000000",
              recipient: BYTES32_ONE,
              callbackData: "0x",
              context: "0x",
            },
          ],
        },
        inputSettler: INPUT_SETTLER,
        sponsorSignature: null,
        allocatorSignature: "0x1234",
      },
    };

    const parsed = parseOrderStatusPayload(payload);

    expect(parsed.inputSettler).toBe(INPUT_SETTLER);
    expect(parsed.order.nonce).toBe(123n);
    expect(isStandardOrder(parsed.order) && parsed.order.originChainId).toBe(
      8453n,
    );
    expect(parsed.sponsorSignature).toEqual({ type: "None", payload: "0x" });
    expect(parsed.allocatorSignature).toEqual({
      type: "ECDSA",
      payload: "0x1234",
    });
  });

  it("parses a multichain payload nested under data[0].intent", () => {
    const payload = {
      data: [
        {
          intent: {
            order: {
              user: "0x1111111111111111111111111111111111111111",
              nonce: "12",
              expires: 2_000_000_000,
              fillDeadline: 1_999_999_900,
              inputOracle: "0x0000000000000000000000000000000000000001",
              outputs: [
                {
                  oracle: BYTES32_ONE,
                  settler: BYTES32_ONE,
                  chainId: "8453",
                  token: BYTES32_ONE,
                  amount: "100",
                  recipient: BYTES32_ONE,
                  callbackData: "0x",
                  context: "0x",
                },
              ],
              inputs: [
                { chainId: "1", inputs: [["1", "10"]] },
                { chainId: "42161", inputs: [["2", "20"]] },
              ],
            },
            inputSettler: INPUT_SETTLER,
            sponsorSignature: "0xbeef",
            allocatorSignature: null,
          },
        },
      ],
    };

    const parsed = parseOrderStatusPayload(payload);
    expect(isStandardOrder(parsed.order)).toBe(false);
    if (isStandardOrder(parsed.order))
      throw new Error("Expected multichain order");

    expect(parsed.order.inputs.length).toBe(2);
    expect(parsed.order.inputs[1].chainId).toBe(42161n);
    expect(parsed.sponsorSignature).toEqual({
      type: "ECDSA",
      payload: "0xbeef",
    });
    expect(parsed.allocatorSignature).toEqual({ type: "None", payload: "0x" });
  });

  it("throws for invalid payload", () => {
    expect(() => parseOrderStatusPayload({ data: {} })).toThrow();
  });

  it("throws when user is not a hex address", () => {
    const payload = {
      data: {
        order: {
          user: "not-a-hex-address",
          nonce: "123",
          originChainId: "8453",
          expires: 2_000_000_000,
          fillDeadline: 1_999_999_900,
          inputOracle: "0x0000000000000000000000000000000000000001",
          inputs: [["1", "1000000"]],
          outputs: [],
        },
        inputSettler: INPUT_SETTLER,
      },
    };

    expect(() => parseOrderStatusPayload(payload)).toThrow(
      "Order payload invalid: order.user",
    );
  });

  it("throws when standard order input tuple is malformed", () => {
    const payload = {
      data: {
        order: {
          user: "0x1111111111111111111111111111111111111111",
          nonce: "123",
          originChainId: "8453",
          expires: 2_000_000_000,
          fillDeadline: 1_999_999_900,
          inputOracle: "0x0000000000000000000000000000000000000001",
          inputs: [["1"]],
          outputs: [],
        },
        inputSettler: INPUT_SETTLER,
      },
    };

    expect(() => parseOrderStatusPayload(payload)).toThrow(
      "Order payload invalid: inputs[0]",
    );
  });
});
