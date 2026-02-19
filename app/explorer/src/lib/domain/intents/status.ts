import type { IntentLifecycleStatus } from './types';

const ORDER_SERVER_STATUS_MAP: Record<string, IntentLifecycleStatus> = {
  Submitted: 'created',
  Open: 'opened',
  Signed: 'opened',
  Delivered: 'delivered',
  Settled: 'finalised'
};

export function mapOrderServerStatus(input: string | null | undefined): IntentLifecycleStatus {
  if (!input) {
    return 'error';
  }

  return ORDER_SERVER_STATUS_MAP[input] ?? 'error';
}
