import { pgTable, uuid, text, numeric } from "drizzle-orm/pg-core";
import { users } from "./users";

export const brokerPreferences = pgTable("broker_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  brokerId: uuid("broker_id")
    .notNull()
    .unique()
    .references(() => users.id),
  cities: text("cities").array().default([]),
  neighborhoods: text("neighborhoods").array().default([]),
  minPrice: numeric("min_price", { precision: 12, scale: 2 }),
  maxPrice: numeric("max_price", { precision: 12, scale: 2 }),
  propertyTypes: text("property_types").array().default([]),
  creci: text("creci"),
});

export type BrokerPreferences = typeof brokerPreferences.$inferSelect;
export type NewBrokerPreferences = typeof brokerPreferences.$inferInsert;
