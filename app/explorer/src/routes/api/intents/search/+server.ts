import { getIntentService } from '$lib/server/intents/container';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const term = url.searchParams.get('q') ?? '';
  const limit = Number(url.searchParams.get('limit') ?? '10');

  const service = getIntentService();
  const data = await service.searchIntents(term, limit);

  return json(data);
};
