"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { companyChannels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth";

export async function toggleChannel(companyId: string, channelType: string, isActive: boolean) {
  await requireRole(["admin_placego"]);

  // Verificar se o canal já existe
  const [existing] = await db
    .select({ id: companyChannels.id })
    .from(companyChannels)
    .where(and(eq(companyChannels.companyId, companyId), eq(companyChannels.channelType, channelType as any)))
    .limit(1);

  if (existing) {
    await db
      .update(companyChannels)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(companyChannels.id, existing.id));
  } else {
    await db.insert(companyChannels).values({
      companyId,
      channelType: channelType as any,
      isActive,
    });
  }

  revalidatePath(`/tenants/${companyId}/channels`);
}

export async function saveChannelConfig(
  companyId: string,
  channelType: string,
  config: Record<string, any>,
  extras?: {
    welcomeMessage?: string;
    afterHoursMessage?: string;
    businessHours?: Record<string, any>;
    keywords?: string[];
  }
) {
  await requireRole(["admin_placego"]);

  const [existing] = await db
    .select({ id: companyChannels.id })
    .from(companyChannels)
    .where(and(eq(companyChannels.companyId, companyId), eq(companyChannels.channelType, channelType as any)))
    .limit(1);

  const values = {
    companyId,
    channelType: channelType as any,
    isActive: true,
    config,
    welcomeMessage: extras?.welcomeMessage,
    afterHoursMessage: extras?.afterHoursMessage,
    businessHours: extras?.businessHours,
    keywords: extras?.keywords ?? [],
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(companyChannels).set(values).where(eq(companyChannels.id, existing.id));
  } else {
    await db.insert(companyChannels).values(values);
  }

  revalidatePath(`/tenants/${companyId}/channels`);
}
