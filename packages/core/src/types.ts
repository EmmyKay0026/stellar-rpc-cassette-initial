import { z } from 'zod';

export const JsonRpcIdSchema = z.union([z.string(), z.number(), z.null()]);

export const JsonRpcRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: JsonRpcIdSchema.optional(),
  method: z.string().min(1),
  params: z.unknown().optional().default({}),
});

export const JsonRpcErrorSchema = z
  .object({
    code: z.number().int(),
    message: z.string(),
    data: z.unknown().optional(),
  })
  .passthrough();

export const JsonRpcResponseSchema = z
  .object({
    jsonrpc: z.literal('2.0').optional(),
    id: JsonRpcIdSchema.optional(),
    result: z.unknown().optional(),
    error: JsonRpcErrorSchema.optional(),
  })
  .passthrough()
  .superRefine((response, context) => {
    const hasResult = Object.hasOwn(response, 'result');
    const hasError = Object.hasOwn(response, 'error');

    if (hasResult === hasError) {
      context.addIssue({
        code: 'custom',
        message: 'JSON-RPC response must contain exactly one of result or error.',
      });
    }
  });

export const CassetteInteractionSchema = z.object({
  sequence: z.number().int().positive(),
  request: JsonRpcRequestSchema,
  response: JsonRpcResponseSchema,
});

export const CassetteSchema = z.object({
  format: z.literal('stellar-rpc-cassette'),
  version: z.literal(1),
  recordedAt: z.string(),
  network: z
    .object({
      passphrase: z.string().optional(),
    })
    .optional(),
  interactions: z.array(CassetteInteractionSchema),
});

export type JsonRpcId = z.infer<typeof JsonRpcIdSchema>;
export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;
export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;
export type CassetteInteraction = z.infer<typeof CassetteInteractionSchema>;
export type Cassette = z.infer<typeof CassetteSchema>;
