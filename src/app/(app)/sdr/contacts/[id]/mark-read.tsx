"use client";

import { useEffect } from "react";
import { markMessagesAsRead } from "@/app/actions/contacts";

export function MarkRead({ contactId }: { contactId: string }) {
  useEffect(() => {
    markMessagesAsRead(contactId);
  }, [contactId]);
  return null;
}
