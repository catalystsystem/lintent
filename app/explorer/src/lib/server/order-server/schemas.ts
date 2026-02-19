import { z } from 'zod';

const nullableString = z.string().nullable().optional();
const nullableStringish = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return value;
}, z.string().nullable().optional());
const chainIdSchema = z.union([z.string(), z.number()]).optional();
const orderLegSchema = z.preprocess(
  (value) => {
    if (Array.isArray(value)) {
      const [token, amount, chainId] = value;
      return {
        token: token ?? null,
        amount: amount ?? null,
        chainId
      };
    }

    return value;
  },
  z
    .object({
      token: nullableStringish,
      amount: nullableStringish,
      chainId: chainIdSchema
    })
    .passthrough()
);

export const orderMetaSchema = z
  .object({
    orderStatus: z.string().optional(),
    onChainOrderId: nullableString,
    catalystOrderId: nullableString,
    solverAddress: nullableString,
    submitTime: nullableStringish,
    signedAt: nullableStringish,
    deliveredAt: nullableStringish,
    settledAt: nullableStringish,
    expiredAt: nullableStringish,
    orderInitiatedTxHash: nullableString,
    orderDeliveredTxHash: nullableString,
    orderVerifiedTxHash: nullableString,
    orderSettledTxHash: nullableString
  })
  .passthrough();

export const orderDtoSchema = z
  .object({
    order: z
      .object({
        user: nullableString,
        inputs: z.array(orderLegSchema).optional(),
        outputs: z.array(orderLegSchema).optional()
      })
      .passthrough()
      .optional(),
    inputSettler: nullableString,
    inputOracle: nullableString,
    outputOracle: nullableString,
    outputSettler: nullableString,
    meta: orderMetaSchema.optional()
  })
  .passthrough();

export const listOrdersResponseSchema = z
  .object({
    data: z.array(orderDtoSchema),
    meta: z
      .object({
        total: z.number().int().nonnegative().optional(),
        limit: z.number().int().nonnegative().optional(),
        offset: z.number().int().nonnegative().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

export const getOrderStatusResponseSchema = orderDtoSchema;

export type OrderDto = z.infer<typeof orderDtoSchema>;
export type ListOrdersResponse = z.infer<typeof listOrdersResponseSchema>;
