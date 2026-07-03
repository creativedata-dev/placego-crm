"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";

const ORIGIN_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  meta_leadgen: "Meta Lead Gen",
  meta_dm_instagram: "Instagram DM",
  meta_dm_facebook: "Facebook DM",
  meta_comment: "Comentário",
  whatsapp: "WhatsApp",
  email: "Email",
  lp: "Landing Page",
  indicacao: "Indicação",
  manual: "Manual",
  portal: "Portal",
};

const SDR_STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  aguardando: "Aguardando",
  qualificado: "Qualificado",
  distribuido: "Distribuído",
  invalido: "Inválido",
  arquivado: "Arquivado",
};

const PIPELINE_STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  contacted: "Em contato",
  visiting: "Visita",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};

const SDR_STATUS_COLOR: Record<string, string> = {
  novo: "bg-blue-100 text-blue-700",
  em_contato: "bg-yellow-100 text-yellow-700",
  aguardando: "bg-orange-100 text-orange-700",
  qualificado: "bg-green-100 text-green-700",
  distribuido: "bg-purple-100 text-purple-700",
  invalido: "bg-red-100 text-red-700",
  arquivado: "bg-gray-100 text-gray-500",
};

const PIPELINE_STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  visiting: "bg-indigo-100 text-indigo-700",
  proposal: "bg-violet-100 text-violet-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  origin: string;
  stage: string;
  qualityScore: number | null;
  createdAt: Date;
  qualifiedAt: Date | null;
  tenantName: string | null;
  sdrName: string | null;
  sdrStatus: string | null;
  pipelineStatus: string | null;
  brokerName: string | null;
  tags: { id: string; name: string; color: string }[];
};

interface Props {
  contacts: Contact[];
  tenants: { id: string; name: string }[];
  sdrs: { id: string; name: string }[];
}

export function ContactsTable({ contacts, tenants, sdrs }: Props) {
  const [search, setSearch] = useState("");
  const [originFilter, setOriginFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [sdrFilter, setSdrFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.phone?.includes(q) && !c.email?.toLowerCase().includes(q)) return false;
      if (originFilter !== "all" && c.origin !== originFilter) return false;
      if (tenantFilter !== "all" && c.tenantName !== tenantFilter) return false;
      if (sdrFilter !== "all" && c.sdrName !== sdrFilter) return false;
      if (statusFilter !== "all" && c.sdrStatus !== statusFilter) return false;
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      return true;
    });
  }, [contacts, search, originFilter, tenantFilter, sdrFilter, statusFilter, stageFilter]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (originFilter !== "all") params.set("origin", originFilter);
    if (tenantFilter !== "all") params.set("tenant", tenantFilter);
    if (sdrFilter !== "all") params.set("sdr", sdrFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (stageFilter !== "all") params.set("stage", stageFilter);
    window.open(`/api/reports/contacts.csv?${params.toString()}`, "_blank");
  };

  const fmt = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

  const origins = Array.from(new Set(contacts.map((c) => c.origin)));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Buscar por nome, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={stageFilter} onValueChange={(v) => v && setStageFilter(v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas fases</SelectItem>
            <SelectItem value="contato">Contato</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status SDR" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(SDR_STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={originFilter} onValueChange={(v) => v && setOriginFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            {origins.map((o) => (
              <SelectItem key={o} value={o}>{ORIGIN_LABELS[o] ?? o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tenants.length > 0 && (
          <Select value={tenantFilter} onValueChange={(v) => v && setTenantFilter(v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas empresas</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {sdrs.length > 0 && (
          <Select value={sdrFilter} onValueChange={(v) => v && setSdrFilter(v)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="SDR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos SDRs</SelectItem>
              {sdrs.map((s) => (
                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="size-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Nome</th>
              <th className="px-3 py-2 text-left font-medium">Telefone</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Empresa</th>
              <th className="px-3 py-2 text-left font-medium">Origem</th>
              <th className="px-3 py-2 text-left font-medium">SDR</th>
              <th className="px-3 py-2 text-left font-medium">Status SDR</th>
              <th className="px-3 py-2 text-left font-medium">Pipeline</th>
              <th className="px-3 py-2 text-left font-medium">Corretor</th>
              <th className="px-3 py-2 text-left font-medium">Score</th>
              <th className="px-3 py-2 text-left font-medium">Tags</th>
              <th className="px-3 py-2 text-left font-medium">Criado</th>
              <th className="px-3 py-2 text-left font-medium">Qualificado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhum contato encontrado
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-3 py-2">{c.tenantName ?? "—"}</td>
                  <td className="px-3 py-2">{ORIGIN_LABELS[c.origin] ?? c.origin}</td>
                  <td className="px-3 py-2">{c.sdrName ?? "—"}</td>
                  <td className="px-3 py-2">
                    {c.sdrStatus ? (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SDR_STATUS_COLOR[c.sdrStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {SDR_STATUS_LABELS[c.sdrStatus] ?? c.sdrStatus}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {c.pipelineStatus ? (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PIPELINE_STATUS_COLOR[c.pipelineStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {PIPELINE_STATUS_LABELS[c.pipelineStatus] ?? c.pipelineStatus}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2">{c.brokerName ?? "—"}</td>
                  <td className="px-3 py-2 text-center">{c.qualityScore ?? 0}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: t.color }}
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmt(c.createdAt)}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmt(c.qualifiedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
