import { describe, expect, it } from "bun:test";
import { listOrdersResponseSchema } from "../../../../src/lib/server/intent-api/schemas";

describe("listOrdersResponseSchema", () => {
  it("accepts numeric timestamps and array-based input/output legs", () => {
    const parsed = listOrdersResponseSchema.parse({
      data: [
        {
          order: {
            user: "0xabc",
            inputs: [["0xTokenIn", 12345, 1]],
            outputs: [["0xTokenOut", "67890", 8453]],
          },
          meta: {
            orderStatus: "Delivered",
            submitTime: 1739880000,
          },
        },
      ],
      meta: {
        total: 1,
        limit: 50,
        offset: 0,
      },
    });

    expect(parsed.data[0]?.meta?.submitTime).toBe("1739880000");
    expect(parsed.data[0]?.order?.inputs?.[0]?.token).toBe("0xTokenIn");
    expect(parsed.data[0]?.order?.inputs?.[0]?.amount).toBe("12345");
    expect(parsed.data[0]?.order?.inputs?.[0]?.chainId).toBe(1);
  });
});
