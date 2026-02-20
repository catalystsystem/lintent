import { env } from "$env/dynamic/private";

function parsePositiveInt(
  rawValue: string | undefined,
  fallback: number,
): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export const serverConfig = {
  intentApiBaseUrl: env.INTENT_API_BASE_URL ?? "https://order.li.fi",
  intentApiTimeoutMs: parsePositiveInt(env.INTENT_API_TIMEOUT_MS, 10_000),
};
