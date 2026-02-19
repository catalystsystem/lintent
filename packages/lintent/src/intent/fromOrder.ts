import type {
  CompactLock,
  EscrowLock,
  MultichainOrder,
  StandardOrder,
} from "../types";
import { MultichainOrderIntent } from "./multichain";
import { StandardOrderIntent } from "./standard";

type OrderLike = StandardOrder | MultichainOrder;

type IntentForOrder<TOrder extends OrderLike> = TOrder extends StandardOrder
  ? StandardOrderIntent
  : MultichainOrderIntent;

type OrderToIntentOptions<TOrder extends OrderLike> = {
  inputSettler: `0x${string}`;
  order: TOrder;
  lock?: EscrowLock | CompactLock;
};

export function isStandardOrder(order: OrderLike): order is StandardOrder {
  return "originChainId" in order;
}

export function orderToIntent<TOrder extends OrderLike>(
  options: OrderToIntentOptions<TOrder>,
): IntentForOrder<TOrder> {
  const { inputSettler, order, lock } = options;
  if (isStandardOrder(order)) {
    return new StandardOrderIntent(
      inputSettler,
      order,
    ) as IntentForOrder<TOrder>;
  }
  return new MultichainOrderIntent(
    inputSettler,
    order,
    lock,
  ) as IntentForOrder<TOrder>;
}
