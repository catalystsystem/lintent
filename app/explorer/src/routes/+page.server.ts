import { getIntentService } from '$lib/server/intents/container';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const service = getIntentService();

  const data = await service.listIntents({
    cursor: url.searchParams.get('cursor') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    user: url.searchParams.get('user') ?? undefined,
    orderId: url.searchParams.get('orderId') ?? undefined,
    catalystOrderId: url.searchParams.get('catalystOrderId') ?? undefined,
    limit: Number(url.searchParams.get('limit') ?? '25')
  });

  return {
    query: {
      status: url.searchParams.get('status') ?? '',
      user: url.searchParams.get('user') ?? '',
      orderId: url.searchParams.get('orderId') ?? '',
      catalystOrderId: url.searchParams.get('catalystOrderId') ?? ''
    },
    ...data
  };
};
