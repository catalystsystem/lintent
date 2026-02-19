export type IntentSource = 'lifi' | 'oif';

export type IntentLifecycleStatus =
  | 'incomplete'
  | 'created'
  | 'opened'
  | 'delivered'
  | 'validated'
  | 'finalised'
  | 'expired'
  | 'expired_unrefundable'
  | 'refunded'
  | 'error';

export interface IntentListQuery {
  status?: string;
  sourceChain?: string;
  destChain?: string;
  user?: string;
  solver?: string;
  orderId?: string;
  catalystOrderId?: string;
  cursor?: string;
  limit?: number;
}

export interface IntentSummary {
  orderId: string;
  catalystOrderId: string | null;
  status: IntentLifecycleStatus;
  sourceChain: string;
  destinationChain: string;
  inputAmount: string | null;
  inputToken: string | null;
  outputAmount: string | null;
  outputToken: string | null;
  user: string | null;
  solver: string | null;
  updatedAt: string | null;
  intentSource: IntentSource;
}

export interface IntentDetail extends IntentSummary {
  timeline: Array<{
    label: string;
    timestamp: string | null;
    txHash: string | null;
  }>;
  componentAddresses: {
    inputSettler: string | null;
    inputOracle: string | null;
    outputOracle: string | null;
    outputSettler: string | null;
  };
  txHashes: {
    initiated: string | null;
    delivered: string | null;
    verified: string | null;
    settled: string | null;
  };
  raw: unknown;
}

export interface PaginatedIntents {
  items: IntentSummary[];
  nextCursor: string | null;
}
