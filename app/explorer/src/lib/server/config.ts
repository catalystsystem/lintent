import { env } from '$env/dynamic/private';

function parsePositiveInt(rawValue: string | undefined, fallback: number): number {
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
  orderServerBaseUrl: env.ORDER_SERVER_BASE_URL ?? 'https://order.li.fi',
  orderServerTimeoutMs: parsePositiveInt(env.ORDER_SERVER_TIMEOUT_MS, 10_000)
};
