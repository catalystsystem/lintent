import {
  INPUT_SETTLER_COMPACT_LIFI,
  INPUT_SETTLER_ESCROW_LIFI,
  MULTICHAIN_INPUT_SETTLER_COMPACT,
  MULTICHAIN_INPUT_SETTLER_ESCROW,
} from "../../constants";
import type { CompactLock, EscrowLock } from "../../types";

export const ONE_MINUTE = 60;
export const ONE_HOUR = 60 * ONE_MINUTE;
export const ONE_DAY = 24 * ONE_HOUR;

export function selectAllBut<T>(arr: T[], index: number): T[] {
  return [...arr.slice(0, index), ...arr.slice(index + 1, arr.length)];
}

export function inputSettlerForLock(
  lock: EscrowLock | CompactLock,
  multichain: boolean,
) {
  if (lock.type === "compact" && multichain === false)
    return INPUT_SETTLER_COMPACT_LIFI;
  if (lock.type === "compact" && multichain === true)
    return MULTICHAIN_INPUT_SETTLER_COMPACT;
  if (lock.type === "escrow" && multichain === false)
    return INPUT_SETTLER_ESCROW_LIFI;
  if (lock.type === "escrow" && multichain === true)
    return MULTICHAIN_INPUT_SETTLER_ESCROW;

  throw new Error(
    `Not supported | multichain: ${multichain}, type: ${lock.type}`,
  );
}
