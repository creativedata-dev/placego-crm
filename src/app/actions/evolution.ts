"use server";

import { requireRole } from "@/lib/auth";
import { createInstance, deleteInstance, setInstanceWebhook } from "@/lib/evolution";

export async function createEvolutionInstance(instanceName: string) {
  await requireRole(["admin_placego"]);
  return createInstance(instanceName);
}

export async function deleteEvolutionInstance(instanceName: string) {
  await requireRole(["admin_placego"]);
  return deleteInstance(instanceName);
}

export async function registerEvolutionWebhook(instanceName: string) {
  await requireRole(["admin_placego"]);
  return setInstanceWebhook(instanceName);
}
