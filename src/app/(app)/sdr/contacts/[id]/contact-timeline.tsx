"use client";

import type { ContactMessage } from "@/db/schema";

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: "💬",
  instagram_dm: "📸",
  facebook_dm: "📘",
  email: "✉️",
  comment: "🗨️",
};

interface MessageWithSdr extends ContactMessage {
  sdrName: string | null;
}

interface Props {
  messages: MessageWithSdr[];
  origin: string;
}

// ✓ pending | ✓✓ server/delivered | ✓✓ azul = read | ✗ error
function AckTicks({ ack, channel }: { ack: number | null; channel: string }) {
  if (channel !== "whatsapp" || ack === null) return null;
  if (ack === -1) return <span className="text-xs text-red-400" title="Erro">✗</span>;
  if (ack === 0) return <span className="text-xs text-gray-300" title="Pendente">✓</span>;
  if (ack === 1) return <span className="text-xs text-gray-300" title="Enviado">✓✓</span>;
  if (ack === 2) return <span className="text-xs text-gray-300" title="Entregue">✓✓</span>;
  if (ack >= 3) return <span className="text-xs text-blue-300" title="Lido">✓✓</span>;
  return null;
}

function MessageContent({ content, channel, isOut, mediaUrl, mediaType }: {
  content: string;
  channel: string;
  isOut: boolean;
  mediaUrl: string | null | undefined;
  mediaType: string | null | undefined;
}) {
  // Renderizar mídia se existir
  if (mediaUrl && mediaType) {
    return (
      <div className="space-y-1.5">
        {mediaType === "image" && (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={mediaUrl}
              alt="imagem"
              className="max-w-[240px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
        )}
        {mediaType === "audio" && (
          <audio controls className="max-w-[240px]" style={{ height: 36 }}>
            <source src={mediaUrl} />
          </audio>
        )}
        {mediaType === "video" && (
          <video controls className="max-w-[240px] rounded-lg">
            <source src={mediaUrl} />
          </video>
        )}
        {mediaType === "document" && (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 text-xs underline ${isOut ? "text-primary-foreground" : "text-primary"}`}
          >
            📎 {content !== `[${mediaType}]` ? content : "Documento"}
          </a>
        )}
        {content && content !== `[${mediaType}]` && mediaType !== "document" && (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        )}
      </div>
    );
  }

  // Email com subject destacado
  if (channel === "email") {
    const sep = content.indexOf("\n\n");
    if (sep > 0) {
      const subject = content.slice(0, sep).trim();
      const body = content.slice(sep + 2).trim();
      return (
        <div className="space-y-1.5">
          <p className={`font-semibold text-xs uppercase tracking-wide ${isOut ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {subject}
          </p>
          <p className="whitespace-pre-wrap">{body}</p>
        </div>
      );
    }
  }

  return <p className="whitespace-pre-wrap">{content}</p>;
}

export function ContactTimeline({ messages, origin }: Props) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-xl bg-muted/20">
        <span className="text-3xl mb-2">
          {origin === "whatsapp" ? "💬" : origin === "email" ? "✉️" : "📨"}
        </span>
        <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
        <p className="text-xs mt-1">Responda abaixo para iniciar a conversa</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 min-h-[200px] max-h-[420px] overflow-y-auto border rounded-xl p-4 bg-muted/10">
      {messages.map((msg) => {
        const isOut = msg.direction === "out";
        const time = new Date(msg.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const date = new Date(msg.sentAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

        return (
          <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] space-y-1 ${isOut ? "items-end" : "items-start"} flex flex-col`}>
              <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${isOut ? "flex-row-reverse" : ""}`}>
                <span>{CHANNEL_ICONS[msg.channel] ?? "📨"}</span>
                <span>{isOut ? (msg.sdrName ?? "SDR") : "Contato"}</span>
                <span>·</span>
                <span>{date} {time}</span>
              </div>

              <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                isOut
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-background border rounded-tl-sm"
              }`}>
                <MessageContent
                  content={msg.content}
                  channel={msg.channel}
                  isOut={isOut}
                  mediaUrl={msg.mediaUrl}
                  mediaType={msg.mediaType}
                />
                {isOut && (
                  <div className="flex justify-end mt-0.5">
                    <AckTicks ack={msg.ack ?? null} channel={msg.channel} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
