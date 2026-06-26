"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { companyChannels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth";

export async function toggleChannel(companyId: string, channelType: string, isActive: boolean) {
  await requireRole(["admin_placego"]);

  await db
    .insert(companyChannels)
    .values({ companyId, channelType: channelType as any, isActive })
    .onConflictDoUpdate({
      target: [companyChannels.companyId, companyChannels.channelType],
      set: { isActive, updatedAt: new Date() },
    });

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

  await db
    .insert(companyChannels)
    .values({
      companyId,
      channelType: channelType as any,
      isActive: true,
      config,
      welcomeMessage: extras?.welcomeMessage,
      afterHoursMessage: extras?.afterHoursMessage,
      businessHours: extras?.businessHours,
      keywords: extras?.keywords ?? [],
    })
    .onConflictDoUpdate({
      target: [companyChannels.companyId, companyChannels.channelType],
      set: {
        config,
        welcomeMessage: extras?.welcomeMessage,
        afterHoursMessage: extras?.afterHoursMessage,
        businessHours: extras?.businessHours,
        keywords: extras?.keywords ?? [],
        updatedAt: new Date(),
      },
    });

  revalidatePath(`/tenants/${companyId}/channels`);
}
