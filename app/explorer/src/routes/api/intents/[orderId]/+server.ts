import { getIntentService } from '$lib/server/intents/container';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const service = getIntentService();
  const detail = await service.getIntentDetail(params.orderId);

  if (!detail) {
    throw error(404, 'Intent not found');
  }

  return json(detail);
};
