"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";

export async function toggleChannel(companyId: string, channelType: string, isActive: boolean) {
  await requireRole(["admin_placego"]);

  await db.execute(sql`
    INSERT INTO company_channels (id, company_id, channel_type, is_active, config, keywords, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      ${companyId},
      ${channelType}::channel_type,
      ${isActive},
      '{}',
      '{}',
      now(),
      now()
    )
    ON CONFLICT (company_id, channel_type)
    DO UPDATE SET is_active = ${isActive}, updated_at = now()
  `);

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

  const configJson = JSON.stringify(config);
  const businessHoursJson = JSON.stringify(extras?.businessHours ?? {});
  const keywordsArray = extras?.keywords ?? [];
  const welcomeMessage = extras?.welcomeMessage ?? null;
  const afterHoursMessage = extras?.afterHoursMessage ?? null;

  await db.execute(sql`
    INSERT INTO company_channels (id, company_id, channel_type, is_active, config, welcome_message, after_hours_message, business_hours, keywords, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      ${companyId},
      ${channelType}::channel_type,
      true,
      ${configJson}::jsonb,
      ${welcomeMessage},
      ${afterHoursMessage},
      ${businessHoursJson}::jsonb,
      ${keywordsArray},
      now(),
      now()
    )
    ON CONFLICT (company_id, channel_type)
    DO UPDATE SET
      config = ${configJson}::jsonb,
      welcome_message = ${welcomeMessage},
      after_hours_message = ${afterHoursMessage},
      business_hours = ${businessHoursJson}::jsonb,
      keywords = ${keywordsArray},
      updated_at = now()
  `);

  revalidatePath(`/tenants/${companyId}/channels`);
}
