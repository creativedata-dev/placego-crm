"use client";

import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "./score-badge";
import { TagPicker } from "@/components/tags/tag-picker";
import { updateSdrAssignmentStatus } from "@/app/actions/contacts";
import type { SdrAssignment, Lead, Tag } from "@/db/schema";
import { CheckCircle, Share2, Archive } from "lucide-react";
import Link from "next/link";

const ORIGIN_LABELS: Record<string, string> = {
  meta_leadgen: "Lead Ads", meta_ads: "Meta Ads", meta_dm_instagram: "Instagram DM",
  meta_dm_facebook: "Facebook DM", meta_comment: "Comentário", whatsapp: "WhatsApp",
  email: "Email", lp: "Landing Page", indicacao: "Indicação", manual: "Manual", portal: "Portal",
};

const ORIGIN_COLORS: Record<string, string> = {
  meta_leadgen: "bg-blue-500/10 text-blue-700 border-blue-200",
  meta_ads: "bg-blue-500/10 text-blue-700 border-blue-200",
  meta_dm_instagram: "bg-pink-500/10 text-pink-700 border-pink-200",
  meta_dm_facebook: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  meta_comment: "bg-purple-500/10 text-purple-700 border-purple-200",
  whatsapp: "bg-green-500/10 text-green-700 border-green-200",
  email: "bg-orange-500/10 text-orange-700 border-orange-200",
  lp: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  indicacao: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  manual: "bg-gray-500/10 text-gray-700 border-gray-200",
  portal: "bg-teal-500/10 text-teal-700 border-teal-200",
};

interface Props {
  assignment: SdrAssignment;
  contact: Lead;
  propertyAddress: string | null;
  propertyNeighborhood: string | null;
  tenantName: string | null;
  sdrName: string | null;
  tags: Tag[];
  brokerNames: string[];
  unreadCount: number;
  isAdmin: boolean;
  onDragStart?: () => void;
  onDragEnd: () => void;
}

export function SdrLeadCard({
  assignment, contact, propertyAddress, propertyNeighborhood, tenantName, sdrName, tags, brokerNames,
  unreadCount, isAdmin, onDragStart, onDragEnd,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const source = propertyAddress
    ? `${propertyAddress}${propertyNeighborhood ? ` — ${propertyNeighborhood}` : ""}`
    : null;

  const age = Math.floor((Date.now() - new Date(contact.createdAt).getTime()) / 60000);
  const ageLabel = age < 60 ? `${age}min` : age < 1440 ? `${Math.floor(age / 60)}h` : `${Math.floor(age / 1440)}d`;

  function qualify() {
    startTransition(() => updateSdrAssignmentStatus(assignment.id, "qualificado"));
  }

  function archive() {
    if (!confirm("Arquivar este lead? Ele sairá do kanban mas ficará no histórico.")) return;
    startTransition(() => updateSdrAssignmentStatus(assignment.id, "arquivado"));
  }

  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-background border rounded-lg p-3 shadow-xs hover:shadow-sm transition-shadow space-y-2 ${onDragStart ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between gap-1">
        <a href={`/sdr/contacts/${contact.id}`} className="font-semibold text-sm leading-tight hover:underline hover:text-primary flex items-center gap-1.5">
          {contact.name}
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
              {unreadCount}
            </span>
          )}
        </a>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{ageLabel}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <ScoreBadge score={contact.qualityScore ?? 0} compact />
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${ORIGIN_COLORS[contact.origin] ?? ORIGIN_COLORS.manual}`}>
          {ORIGIN_LABELS[contact.origin] ?? contact.origin}
        </span>
      </div>

      <p className="text-xs text-muted-foreground font-mono">{contact.phone}</p>

      {isAdmin && sdrName && (
        <Badge variant="outline" className="text-[10px]">SDR: {sdrName}</Badge>
      )}

      {brokerNames.length > 0 && (
        <Badge className="text-[10px] bg-purple-500/10 text-purple-700 border-purple-200 hover:bg-purple-500/10">
          🤝 {brokerNames.join(", ")}
        </Badge>
      )}

      {tenantName && (
        <p className="text-[10px] text-muted-foreground truncate">🏢 {tenantName}</p>
      )}
      {source && (
        <p className="text-[10px] text-muted-foreground truncate">📍 {source}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1 pt-1 border-t items-center">
        <TagPicker contactId={contact.id} initialTags={tags} compact />

        <div className="ml-auto flex gap-1">
          {assignment.status !== "qualificado" && assignment.status !== "distribuido" && assignment.status !== "invalido" && (
            <Button
              size="sm" variant="ghost"
              className="h-6 px-1.5 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={qualify}
              disabled={isPending}
              title="Qualificar"
            >
              <CheckCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          {assignment.status === "qualificado" && (
            <Button
              size="sm" variant="ghost"
              className="h-6 px-1.5 text-primary"
              nativeButton={false}
              render={<Link href={`/sdr/routing/${contact.id}`} />}
              title="Distribuir"
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {assignment.status === "distribuido" && (
            <Button
              size="sm" variant="ghost"
              className="h-6 px-1.5 text-muted-foreground hover:text-foreground"
              onClick={archive}
              disabled={isPending}
              title="Arquivar"
            >
              <Archive className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
