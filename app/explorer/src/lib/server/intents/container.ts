import { IntentApiClient } from "$lib/server/intent-api/client";
import { Phase0IntentApiIntentRepository } from "$lib/server/intents/phase0-intent-api-repository";
import { IntentService } from "$lib/server/intents/service";

let service: IntentService | null = null;

export function getIntentService(): IntentService {
  if (!service) {
    const client = new IntentApiClient();
    const repository = new Phase0IntentApiIntentRepository(client);
    service = new IntentService(repository);
  }

  return service;
}
