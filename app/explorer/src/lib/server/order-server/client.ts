import { serverConfig } from '$lib/server/config';
import {
  getOrderStatusResponseSchema,
  listOrdersResponseSchema,
  type ListOrdersResponse,
  type OrderDto
} from '$lib/server/order-server/schemas';

export interface ListOrdersParams {
  limit: number;
  offset: number;
  status?: string;
  user?: string;
  onChainOrderId?: string;
  catalystOrderId?: string;
}

export class OrderServerClient {
  constructor(
    private readonly baseUrl: string = serverConfig.orderServerBaseUrl,
    private readonly timeoutMs: number = serverConfig.orderServerTimeoutMs
  ) {}

  async listOrders(params: ListOrdersParams): Promise<ListOrdersResponse> {
    const search = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset)
    });

    if (params.status) {
      search.set('status', params.status);
    }
    if (params.user) {
      search.set('user', params.user);
    }
    if (params.onChainOrderId) {
      search.set('onChainOrderId', params.onChainOrderId);
    }
    if (params.catalystOrderId) {
      search.set('catalystOrderId', params.catalystOrderId);
    }

    const raw = await this.fetchJson(`/orders?${search.toString()}`);
    return listOrdersResponseSchema.parse(raw);
  }

  async getOrderByOnChainOrderId(orderId: string): Promise<OrderDto | null> {
    const search = new URLSearchParams({ onChainOrderId: orderId });
    const raw = await this.fetchJson(`/orders/status?${search.toString()}`);

    if (Array.isArray(raw)) {
      if (raw.length === 0) {
        return null;
      }
      return getOrderStatusResponseSchema.parse(raw[0]);
    }

    return getOrderStatusResponseSchema.parse(raw);
  }

  private async fetchJson(path: string): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Order server responded with status ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}
