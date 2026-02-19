import { OrderServerClient } from '$lib/server/order-server/client';
import { Phase0OrderServerIntentRepository } from '$lib/server/intents/phase0-order-server-repository';
import { IntentService } from '$lib/server/intents/service';

let service: IntentService | null = null;

export function getIntentService(): IntentService {
  if (!service) {
    const client = new OrderServerClient();
    const repository = new Phase0OrderServerIntentRepository(client);
    service = new IntentService(repository);
  }

  return service;
}
