"use client";

import { useState } from "react";
import { Plus, ChevronDown, Zap } from "lucide-react";
import Link from "next/link";
import { ChannelCard } from "./channel-card";
import { WhatsAppConnector } from "./connectors/whatsapp-connector";
import { MetaDmConnector } from "./connectors/meta-dm-connector";
import { EmailConnector } from "./connectors/email-connector";
import { CommentConnector } from "./connectors/comment-connector";
import { EvolutionProviderCard } from "./connectors/evolution-provider-card";
import { MetaCloudProviderCard } from "./connectors/meta-cloud-provider-card";
import type { CompanyChannel } from "@/db/schema";

const CONNECTOR_CATALOG = [
  {
    key: "whatsapp_evolution",
    icon: "💬",
    title: "WhatsApp — Evolution API",
    description: "Conecte via QR Code com número pessoal ou chip dedicado",
  },
  {
    key: "whatsapp_meta_cloud",
    icon: "✅",
    title: "WhatsApp — Meta Cloud API",
    description: "API oficial do Meta com número verificado no Business Manager",
  },
  {
    key: "instagram_dm",
    icon: "📸",
    title: "Instagram Direct",
    description: "Receba mensagens diretas do Instagram e converta em contatos",
  },
  {
    key: "facebook_dm",
    icon: "📘",
    title: "Facebook Messenger",
    description: "Receba mensagens do Messenger da página do Facebook",
  },
  {
    key: "meta_comment",
    icon: "🗨️",
    title: "Comentários (Meta)",
    description: "Capture leads de comentários em posts e anúncios",
  },
  {
    key: "email",
    icon: "✉️",
    title: "Email",
    description: "Receba emails e converta automaticamente em contatos",
  },
  {
    key: "meta_leadgen",
    icon: "📋",
    title: "Meta Lead Ads",
    description: "Formulários de captação nas campanhas do Facebook e Instagram",
  },
] as const;

type ConnectorKey = typeof CONNECTOR_CATALOG[number]["key"];

interface Props {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  webhookToken: string;
  whatsappProvider: "evolution" | "meta_cloud";
  metaPhoneNumberId: string;
  metaAccessToken: string;
  metaWabaId: string;
  metaVerifyToken: string;
  metaAutoWelcome: boolean;
  channels: CompanyChannel[];
  appUrl: string;
}

export function ChannelsManager({
  tenantId,
  tenantName,
  tenantSlug,
  webhookToken,
  whatsappProvider,
  metaPhoneNumberId,
  metaAccessToken,
  metaWabaId,
  metaVerifyToken,
  metaAutoWelcome,
  channels,
  appUrl,
}: Props) {
  const instanceName = `placego-${tenantSlug}`;
  const getChannel = (type: string) => channels.find((c) => c.channelType === type) ?? null;

  function isConnectorActive(key: ConnectorKey): boolean {
    if (key === "whatsapp_evolution") return whatsappProvider === "evolution";
    if (key === "whatsapp_meta_cloud") return whatsappProvider === "meta_cloud";
    const channelTypeMap: Record<string, string> = {
      instagram_dm: "instagram_dm",
      facebook_dm: "facebook_dm",
      meta_comment: "meta_comment",
      email: "email",
      meta_leadgen: "meta_leadgen",
    };
    return getChannel(channelTypeMap[key])?.isActive === true;
  }

  const initialVisible = new Set<ConnectorKey>(
    CONNECTOR_CATALOG.filter((c) => isConnectorActive(c.key)).map((c) => c.key)
  );

  // Se nada ativo, mostra Evolution por padrão
  if (initialVisible.size === 0) initialVisible.add("whatsapp_evolution");

  const [visible, setVisible] = useState<Set<ConnectorKey>>(initialVisible);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toAdd = CONNECTOR_CATALOG.filter((c) => !visible.has(c.key));

  function addConnector(key: ConnectorKey) {
    setVisible((prev) => new Set([...prev, key]));
    setDropdownOpen(false);
  }

  // Canal "virtual" para indicar status dos provedores WA
  const evolutionChannel: CompanyChannel | null = whatsappProvider === "evolution"
    ? ({ isActive: true } as CompanyChannel)
    : null;
  const metaCloudChannel: CompanyChannel | null = whatsappProvider === "meta_cloud"
    ? ({ isActive: true } as CompanyChannel)
    : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Empresa</p>
          <h1 className="text-2xl font-bold">{tenantName}</h1>
        </div>
        <Link href={`/tenants/${tenantId}/automations`}
          className="flex items-center gap-1.5 text-sm font-medium border rounded-lg px-3 py-2 hover:bg-muted transition-colors shrink-0">
          <Zap className="h-4 w-4" />Automações
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Conectores</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Canais de atendimento desta empresa. Cada canal ativo recebe contatos automaticamente.
          </p>
        </div>

        {toAdd.length > 0 && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-72 bg-popover border rounded-xl shadow-lg overflow-hidden">
                  {toAdd.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => addConnector(c.key)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted text-left transition-colors"
                    >
                      <span className="text-xl mt-0.5">{c.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* WhatsApp — Evolution API */}
        {visible.has("whatsapp_evolution") && (
          <ChannelCard
            icon="💬"
            title="WhatsApp — Evolution API"
            description="Conecte via QR Code com número pessoal ou chip dedicado"
            channel={evolutionChannel}
            companyId={tenantId}
            channelType="whatsapp"
            readOnly
          >
            <div className="space-y-6">
              <EvolutionProviderCard tenantId={tenantId} currentProvider={whatsappProvider} />
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Conexão WhatsApp
                </p>
                <WhatsAppConnector
                  companyId={tenantId}
                  instanceName={instanceName}
                  channel={getChannel("whatsapp")}
                />
              </div>
            </div>
          </ChannelCard>
        )}

        {/* WhatsApp — Meta Cloud API */}
        {visible.has("whatsapp_meta_cloud") && (
          <ChannelCard
            icon="✅"
            title="WhatsApp — Meta Cloud API"
            description="API oficial do Meta com número verificado no Business Manager"
            channel={metaCloudChannel}
            companyId={tenantId}
            channelType="whatsapp"
            readOnly
          >
            <MetaCloudProviderCard
              tenantId={tenantId}
              currentProvider={whatsappProvider}
              metaPhoneNumberId={metaPhoneNumberId}
              metaAccessToken={metaAccessToken}
              metaWabaId={metaWabaId}
              metaVerifyToken={metaVerifyToken}
              metaAutoWelcome={metaAutoWelcome}
            />
          </ChannelCard>
        )}

        {/* Instagram DM */}
        {visible.has("instagram_dm") && (
          <ChannelCard
            icon="📸"
            title="Instagram Direct"
            description="Receba mensagens diretas do Instagram e converta em contatos"
            channel={getChannel("instagram_dm")}
            companyId={tenantId}
            channelType="instagram_dm"
          >
            <MetaDmConnector
              companyId={tenantId}
              channelType="instagram_dm"
              channel={getChannel("instagram_dm")}
              label="Instagram"
              placeholder="Ex: @manaira.empreendimentos"
            />
          </ChannelCard>
        )}

        {/* Facebook Messenger */}
        {visible.has("facebook_dm") && (
          <ChannelCard
            icon="📘"
            title="Facebook Messenger"
            description="Receba mensagens do Messenger da página do Facebook"
            channel={getChannel("facebook_dm")}
            companyId={tenantId}
            channelType="facebook_dm"
          >
            <MetaDmConnector
              companyId={tenantId}
              channelType="facebook_dm"
              channel={getChannel("facebook_dm")}
              label="Facebook"
              placeholder="Ex: Manaira Empreendimentos"
            />
          </ChannelCard>
        )}

        {/* Comentários */}
        {visible.has("meta_comment") && (
          <ChannelCard
            icon="🗨️"
            title="Comentários (Meta)"
            description="Capture leads de comentários em posts e anúncios do Facebook e Instagram"
            channel={getChannel("meta_comment")}
            companyId={tenantId}
            channelType="meta_comment"
          >
            <CommentConnector
              companyId={tenantId}
              channel={getChannel("meta_comment")}
            />
          </ChannelCard>
        )}

        {/* Email */}
        {visible.has("email") && (
          <ChannelCard
            icon="✉️"
            title="Email"
            description="Receba emails e converta automaticamente em contatos"
            channel={getChannel("email")}
            companyId={tenantId}
            channelType="email"
          >
            <EmailConnector
              companyId={tenantId}
              channel={getChannel("email")}
            />
          </ChannelCard>
        )}

        {/* Lead Ads */}
        {visible.has("meta_leadgen") && (
          <ChannelCard
            icon="📋"
            title="Meta Lead Ads"
            description="Formulários de captação nas campanhas do Facebook e Instagram"
            channel={getChannel("meta_leadgen")}
            companyId={tenantId}
            channelType="meta_leadgen"
            webhookUrl={`${appUrl}/api/leads/capture?token=${webhookToken}`}
            webhookToken={webhookToken}
            tenantId={tenantId}
            tenantName={tenantName}
          >
            <div className="text-sm text-muted-foreground">
              Configure o webhook no App Meta PlaceGo CRM (ID: 1689147582125041) apontando para a URL acima.
            </div>
          </ChannelCard>
        )}
      </div>
    </div>
  );
}
