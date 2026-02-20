import { mapIntentApiStatus } from "$lib/domain/intents/status";
import type {
  IntentDetail,
  IntentListQuery,
  IntentSummary,
  PaginatedIntents,
} from "$lib/domain/intents/types";
import { decodeOffsetCursor, encodeOffsetCursor } from "$lib/shared/pagination";
import { IntentApiClient } from "$lib/server/intent-api/client";
import type { OrderDto } from "$lib/server/intent-api/schemas";
import type { IntentRepository } from "./repository";

const MAX_INTENT_API_OFFSET = 1000;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

export class Phase0IntentApiIntentRepository implements IntentRepository {
  constructor(private readonly intentApiClient: IntentApiClient) {}

  async list(query: IntentListQuery): Promise<PaginatedIntents> {
    const limit = clampLimit(query.limit);
    const offset = Math.min(
      decodeOffsetCursor(query.cursor),
      MAX_INTENT_API_OFFSET,
    );

    const response = await this.intentApiClient.listOrders({
      limit,
      offset,
      status: query.status,
      user: query.user,
      onChainOrderId: query.orderId,
      catalystOrderId: query.catalystOrderId,
    });

    const total = response.meta?.total ?? offset + response.data.length;
    const nextOffset = offset + response.data.length;

    return {
      items: response.data.map(mapToIntentSummary),
      nextCursor:
        response.data.length < limit ||
        nextOffset >= total ||
        nextOffset > MAX_INTENT_API_OFFSET
          ? null
          : encodeOffsetCursor(nextOffset),
    };
  }

  async get(orderId: string): Promise<IntentDetail | null> {
    const order = await this.intentApiClient.getOrderByOnChainOrderId(orderId);
    if (!order) {
      return null;
    }

    return mapToIntentDetail(order);
  }

  async search(term: string, limit: number): Promise<PaginatedIntents> {
    const trimmed = term.trim();

    if (!trimmed) {
      return { items: [], nextCursor: null };
    }

    const response = await this.intentApiClient.listOrders({
      limit: clampLimit(limit),
      offset: 0,
      onChainOrderId: trimmed,
    });

    return {
      items: response.data.map(mapToIntentSummary),
      nextCursor: null,
    };
  }
}

function clampLimit(input: number | undefined): number {
  const value = input ?? DEFAULT_LIMIT;
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(value), MAX_LIMIT);
}

function mapToIntentSummary(order: OrderDto): IntentSummary {
  const firstInput = order.order?.inputs?.[0];
  const firstOutput = order.order?.outputs?.[0];

  return {
    orderId: order.meta?.onChainOrderId ?? "unknown",
    catalystOrderId: order.meta?.catalystOrderId ?? null,
    status: mapIntentApiStatus(order.meta?.orderStatus),
    sourceChain: chainToLabel(firstInput?.chainId),
    destinationChain: chainToLabel(firstOutput?.chainId),
    inputAmount: firstInput?.amount ?? null,
    inputToken: firstInput?.token ?? null,
    outputAmount: firstOutput?.amount ?? null,
    outputToken: firstOutput?.token ?? null,
    user: order.order?.user ?? null,
    solver: order.meta?.solverAddress ?? null,
    updatedAt:
      order.meta?.settledAt ??
      order.meta?.deliveredAt ??
      order.meta?.signedAt ??
      null,
    intentSource: "lifi",
  };
}

function mapToIntentDetail(order: OrderDto): IntentDetail {
  const summary = mapToIntentSummary(order);

  return {
    ...summary,
    timeline: [
      {
        label: "Signed",
        timestamp: order.meta?.signedAt ?? null,
        txHash: null,
      },
      {
        label: "Delivered",
        timestamp: order.meta?.deliveredAt ?? null,
        txHash: order.meta?.orderDeliveredTxHash ?? null,
      },
      {
        label: "Validated",
        timestamp: null,
        txHash: order.meta?.orderVerifiedTxHash ?? null,
      },
      {
        label: "Settled",
        timestamp: order.meta?.settledAt ?? null,
        txHash: order.meta?.orderSettledTxHash ?? null,
      },
    ],
    componentAddresses: {
      inputSettler: order.inputSettler ?? null,
      inputOracle: order.inputOracle ?? null,
      outputOracle: order.outputOracle ?? null,
      outputSettler: order.outputSettler ?? null,
    },
    txHashes: {
      initiated: order.meta?.orderInitiatedTxHash ?? null,
      delivered: order.meta?.orderDeliveredTxHash ?? null,
      verified: order.meta?.orderVerifiedTxHash ?? null,
      settled: order.meta?.orderSettledTxHash ?? null,
    },
    raw: order,
  };
}

function chainToLabel(chainId: string | number | undefined): string {
  switch (String(chainId)) {
    case "1":
      return "Ethereum";
    case "42161":
      return "Arbitrum";
    case "8453":
      return "Base";
    default:
      return "Unknown";
  }
}
