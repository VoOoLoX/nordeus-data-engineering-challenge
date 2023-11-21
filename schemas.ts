import { z } from "zod";

//#region Schemas

export const registrationEventDataSchema = z.object({
  user_id: z.string(),
  name: z.string(),
  country: z.string(),
  device_os: z.union([
    z.literal("Android"),
    z.literal("iOS"),
    z.literal("Web"),
  ]),
  marketing_campaign: z.string().nullable(),
});

export const transactionEventDataSchema = z.object({
  user_id: z.string(),
  transaction_amount: z.union([
    z.number(),
    z.literal(0.99),
    z.literal(1.99),
    z.literal(2.99),
    z.literal(4.99),
    z.literal(5.99),
  ]),
  transaction_currency: z.union([z.literal("EUR"), z.literal("USD")]),
});

export const loginEventDataSchema = z.object({
  user_id: z.string(),
});

export const logoutEventDataSchema = z.object({
  user_id: z.string(),
});

export const registrationEventSchema = z.object({
  event_id: z.number(),
  event_type: z.literal("registration"),
  event_timestamp: z.number(),
  event_data: registrationEventDataSchema,
});

export const loginEventSchema = z.object({
  event_id: z.number(),
  event_type: z.literal("login"),
  event_timestamp: z.number(),
  event_data: loginEventDataSchema,
});

export const transactionEventSchema = z.object({
  event_id: z.number(),
  event_type: z.literal("transaction"),
  event_timestamp: z.number(),
  event_data: transactionEventDataSchema,
});

export const logoutEventSchema = z.object({
  event_id: z.number(),
  event_type: z.literal("logout"),
  event_timestamp: z.number(),
  event_data: logoutEventDataSchema,
});

export const eventSchema = z.union([
  registrationEventSchema,
  loginEventSchema,
  transactionEventSchema,
  logoutEventSchema,
]);

export const exchangeRatesSchema = z.object({
  currency: z.union([z.literal("EUR"), z.literal("USD")]),
  rate_to_usd: z.coerce.number(),
});

//#endregion
