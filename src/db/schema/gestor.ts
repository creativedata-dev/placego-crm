import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { leadAssignments } from "./leads";

export const gestorDistributions = pgTable("gestor_distributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadAssignmentId: uuid("lead_assignment_id").notNull().references(() => leadAssignments.id, { onDelete: "cascade" }),
  gestorId: uuid("gestor_id").notNull().references(() => users.id),
  brokerId: uuid("broker_id").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  notes: text("notes"),
});

export type GestorDistribution = typeof gestorDistributions.$inferSelect;
