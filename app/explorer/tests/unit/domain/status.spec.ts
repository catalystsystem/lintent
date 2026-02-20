import { describe, expect, it } from "bun:test";
import { mapIntentApiStatus } from "$lib/domain/intents/status";

describe("mapIntentApiStatus", () => {
  it("maps known intent-api statuses", () => {
    expect(mapIntentApiStatus("Submitted")).toBe("created");
    expect(mapIntentApiStatus("Open")).toBe("opened");
    expect(mapIntentApiStatus("Delivered")).toBe("delivered");
    expect(mapIntentApiStatus("Settled")).toBe("finalised");
  });

  it("returns error for unknown status", () => {
    expect(mapIntentApiStatus("")).toBe("error");
    expect(mapIntentApiStatus("UNKNOWN")).toBe("error");
  });
});
