import { pgTable, text, integer, bigint } from "drizzle-orm/pg-core";

export const intents = pgTable("intents", {
	id: text("id").primaryKey(),
	orderId: text("order_id").notNull().unique(),
	intentType: text("intent_type").notNull(),
	data: text("data").notNull(),
	createdAt: bigint("created_at", { mode: "number" }).notNull()
});

export const fillTransactions = pgTable("fill_transactions", {
	id: text("id").primaryKey(),
	outputHash: text("output_hash").notNull().unique(),
	txHash: text("tx_hash").notNull()
});

export const schema = { intents, fillTransactions };
