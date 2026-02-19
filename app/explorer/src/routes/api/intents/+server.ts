import { getIntentService } from '$lib/server/intents/container';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const service = getIntentService();

  const data = await service.listIntents({
    cursor: url.searchParams.get('cursor') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    user: url.searchParams.get('user') ?? undefined,
    orderId: url.searchParams.get('orderId') ?? undefined,
    catalystOrderId: url.searchParams.get('catalystOrderId') ?? undefined,
    limit: Number(url.searchParams.get('limit') ?? '25')
  });

  return json(data);
};
