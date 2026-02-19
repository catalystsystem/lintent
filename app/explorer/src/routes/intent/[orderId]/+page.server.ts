import { getIntentService } from '$lib/server/intents/container';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const service = getIntentService();
  const detail = await service.getIntentDetail(params.orderId);

  if (!detail) {
    throw error(404, 'Intent not found');
  }

  return { detail };
};
