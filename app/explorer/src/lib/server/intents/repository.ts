import type { IntentDetail, IntentListQuery, PaginatedIntents } from '$lib/domain/intents/types';

export interface IntentRepository {
  list(query: IntentListQuery): Promise<PaginatedIntents>;
  get(orderId: string): Promise<IntentDetail | null>;
  search(term: string, limit: number): Promise<PaginatedIntents>;
}
