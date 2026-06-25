"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leadAssignments, leadActivities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";

export async function moveAssignment(
  assignmentId: string,
  newStatus: string,
  lossReason?: string
) {
  await requireRole(["corretor", "corretor_tenant", "sdr", "admin_placego"]);

  await db
    .update(leadAssignments)
    .set({
      status: newStatus as any,
      lossReason: lossReason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(leadAssignments.id, assignmentId));

  revalidatePath("/pipeline");
}

export async function addActivity(formData: FormData) {
  const user = await requireRole([
    "corretor",
    "corretor_tenant",
    "sdr",
    "admin_placego",
  ]);

  const assignmentId = formData.get("assignmentId") as string;
  const type = formData.get("type") as string;
  const notes = formData.get("notes") as string;

  await db.insert(leadActivities).values({
    leadAssignmentId: assignmentId,
    userId: user.id,
    type: type as any,
    notes: notes || null,
  });

  revalidatePath("/pipeline");
}
