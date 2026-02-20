import type { IntentLifecycleStatus } from "./types";

const INTENT_API_STATUS_MAP: Record<string, IntentLifecycleStatus> = {
  Submitted: "created",
  Open: "opened",
  Signed: "opened",
  Delivered: "delivered",
  Settled: "finalised",
};

export function mapIntentApiStatus(
  input: string | null | undefined,
): IntentLifecycleStatus {
  if (!input) {
    return "error";
  }

  return INTENT_API_STATUS_MAP[input] ?? "error";
}
