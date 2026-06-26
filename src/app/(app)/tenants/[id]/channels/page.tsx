import { notFound } from "next/navigation";
import { db } from "@/db";
import { tenants, companyChannels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { ChannelCard } from "./channel-card";
import { WhatsAppConnector } from "./connectors/whatsapp-connector";
import { MetaDmConnector } from "./connectors/meta-dm-connector";
import { EmailConnector } from "./connectors/email-connector";
import { CommentConnector } from "./connectors/comment-connector";

export default async function CompanyChannelsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin_placego"]);
  const { id } = await params;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();

  const channels = await db
    .select()
    .from(companyChannels)
    .where(eq(companyChannels.companyId, id));

  const getChannel = (type: string) => channels.find((c) => c.channelType === type) ?? null;

  const instanceName = `placego-${tenant.slug}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-sm text-muted-foreground">Empresa</p>
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Conectores</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure os canais de atendimento desta empresa. Cada canal ativo recebe
          contatos automaticamente e os distribui para os SDRs.
        </p>
      </div>

      <div className="space-y-4">
        {/* WhatsApp */}
        <ChannelCard
          icon="💬"
          title="WhatsApp"
          description="Receba mensagens diretas e notifique corretores via WhatsApp Business"
          channel={getChannel("whatsapp")}
          companyId={id}
          channelType="whatsapp"
        >
          <WhatsAppConnector
            companyId={id}
            instanceName={instanceName}
            channel={getChannel("whatsapp")}
          />
        </ChannelCard>

        {/* Instagram DM */}
        <ChannelCard
          icon="📸"
          title="Instagram Direct"
          description="Receba mensagens diretas do Instagram e converta em contatos"
          channel={getChannel("instagram_dm")}
          companyId={id}
          channelType="instagram_dm"
        >
          <MetaDmConnector
            companyId={id}
            channelType="instagram_dm"
            channel={getChannel("instagram_dm")}
            label="Instagram"
            placeholder="Ex: @manaira.empreendimentos"
          />
        </ChannelCard>

        {/* Facebook Messenger */}
        <ChannelCard
          icon="📘"
          title="Facebook Messenger"
          description="Receba mensagens do Messenger da página do Facebook"
          channel={getChannel("facebook_dm")}
          companyId={id}
          channelType="facebook_dm"
        >
          <MetaDmConnector
            companyId={id}
            channelType="facebook_dm"
            channel={getChannel("facebook_dm")}
            label="Facebook"
            placeholder="Ex: Manaira Empreendimentos"
          />
        </ChannelCard>

        {/* Comentários */}
        <ChannelCard
          icon="🗨️"
          title="Comentários (Meta)"
          description="Capture leads de comentários em posts e anúncios do Facebook e Instagram"
          channel={getChannel("meta_comment")}
          companyId={id}
          channelType="meta_comment"
        >
          <CommentConnector
            companyId={id}
            channel={getChannel("meta_comment")}
          />
        </ChannelCard>

        {/* Email */}
        <ChannelCard
          icon="✉️"
          title="Email"
          description="Receba emails e converta automaticamente em contatos"
          channel={getChannel("email")}
          companyId={id}
          channelType="email"
        >
          <EmailConnector
            companyId={id}
            channel={getChannel("email")}
          />
        </ChannelCard>

        {/* Lead Ads */}
        <ChannelCard
          icon="📋"
          title="Meta Lead Ads"
          description="Formulários de captação de leads nas campanhas do Facebook e Instagram"
          channel={getChannel("meta_leadgen")}
          companyId={id}
          channelType="meta_leadgen"
          webhookUrl={`${process.env.NEXT_PUBLIC_APP_URL}/api/leads/capture?token=${tenant.webhookToken ?? ""}`}
          webhookToken={tenant.webhookToken ?? null}
          tenantId={id}
          tenantName={tenant.name}
        >
          <div className="text-sm text-muted-foreground">
            Configure o webhook no App Meta PlaceGo CRM (ID: 1689147582125041) apontando para a URL acima.
          </div>
        </ChannelCard>
      </div>
    </div>
  );
}
