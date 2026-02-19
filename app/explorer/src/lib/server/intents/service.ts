import type { IntentDetail, IntentListQuery, PaginatedIntents } from '$lib/domain/intents/types';
import type { IntentRepository } from './repository';

export class IntentService {
  constructor(private readonly repository: IntentRepository) {}

  listIntents(query: IntentListQuery): Promise<PaginatedIntents> {
    return this.repository.list(query);
  }

  getIntentDetail(orderId: string): Promise<IntentDetail | null> {
    return this.repository.get(orderId);
  }

  searchIntents(term: string, limit = 10): Promise<PaginatedIntents> {
    return this.repository.search(term, limit);
  }
}
