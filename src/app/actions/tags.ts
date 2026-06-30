"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tags, contactTags } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { requireRole } from "@/lib/auth";

const TAG_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899", "#84cc16"];

export async function listTags() {
  await requireRole(["sdr", "admin_placego"]);
  return db.select().from(tags).orderBy(tags.name);
}

export async function createTag(name: string) {
  const user = await requireRole(["sdr", "admin_placego"]);

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome da tag não pode ser vazio");

  // Verifica se já existe (case-insensitive)
  const [existing] = await db.select().from(tags).where(ilike(tags.name, trimmed)).limit(1);
  if (existing) return existing;

  const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

  const [tag] = await db.insert(tags).values({
    name: trimmed,
    color,
    createdBy: user.id,
  }).returning();

  revalidatePath("/sdr/queue");
  return tag;
}

export async function applyTagToContact(contactId: string, tagId: string) {
  const user = await requireRole(["sdr", "admin_placego"]);

  await db.insert(contactTags).values({
    contactId,
    tagId,
    taggedBy: user.id,
  }).onConflictDoNothing();

  revalidatePath(`/sdr/contacts/${contactId}`);
  revalidatePath("/sdr/queue");
}

export async function removeTagFromContact(contactId: string, tagId: string) {
  await requireRole(["sdr", "admin_placego"]);

  await db.delete(contactTags).where(
    and(eq(contactTags.contactId, contactId), eq(contactTags.tagId, tagId))
  );

  revalidatePath(`/sdr/contacts/${contactId}`);
  revalidatePath("/sdr/queue");
}

export async function getContactTags(contactId: string) {
  return db
    .select({ tag: tags })
    .from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(eq(contactTags.contactId, contactId));
}
