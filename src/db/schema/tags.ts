import { pgTable, uuid, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";
import { leads } from "./leads";

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#6366f1"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contactTags = pgTable("contact_tags", {
  contactId: uuid("contact_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  taggedBy: uuid("tagged_by").references(() => users.id),
  taggedAt: timestamp("tagged_at").notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.contactId, table.tagId] }),
}));

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type ContactTag = typeof contactTags.$inferSelect;
