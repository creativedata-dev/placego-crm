"use client";

import { useEffect, useRef } from "react";
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

// Fundo do chat por canal
const CHAT_BG: Record<string, string> = {
  whatsapp:     "bg-[#e5ddd5] dark:bg-[#1a1a2e]",
  instagram_dm: "bg-gradient-to-b from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30",
  facebook_dm:  "bg-blue-50 dark:bg-blue-950/30",
  email:        "bg-slate-50 dark:bg-slate-900/30",
  comment:      "bg-gray-50 dark:bg-gray-900/30",
};

// Balão da mensagem recebida por canal
const IN_BUBBLE: Record<string, string> = {
  whatsapp:     "bg-white dark:bg-zinc-800 border-0 shadow-sm",
  instagram_dm: "bg-white dark:bg-zinc-800 border-0 shadow-sm",
  facebook_dm:  "bg-white dark:bg-zinc-800 border-0 shadow-sm",
  email:        "bg-white dark:bg-zinc-800 border shadow-sm",
  comment:      "bg-white dark:bg-zinc-800 border shadow-sm",
};

// Balão da mensagem enviada por canal
const OUT_BUBBLE: Record<string, string> = {
  whatsapp:     "bg-[#d9fdd3] dark:bg-[#005c4b] text-zinc-900 dark:text-zinc-100 border-0 shadow-sm",
  instagram_dm: "bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0 shadow-sm",
  facebook_dm:  "bg-blue-500 text-white border-0 shadow-sm",
  email:        "bg-primary text-primary-foreground shadow-sm",
  comment:      "bg-primary text-primary-foreground shadow-sm",
};

export function ContactTimeline({ messages, origin }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatBg = CHAT_BG[origin] ?? "bg-muted/10";

  if (messages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-xl ${chatBg}`}>
        <span className="text-3xl mb-2">
          {origin === "whatsapp" ? "💬" : origin === "email" ? "✉️" : "📨"}
        </span>
        <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
        <p className="text-xs mt-1">Responda abaixo para iniciar a conversa</p>
      </div>
    );
  }

  return (
    <div className={`min-h-[200px] max-h-[420px] overflow-y-auto border rounded-xl p-4 space-y-3 ${chatBg}`}>
      {messages.map((msg) => {
        const isOut = msg.direction === "out";
        const time = new Date(msg.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const date = new Date(msg.sentAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        const inBubble = IN_BUBBLE[msg.channel] ?? "bg-white border shadow-sm";
        const outBubble = OUT_BUBBLE[msg.channel] ?? "bg-primary text-primary-foreground shadow-sm";

        return (
          <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] space-y-1 flex flex-col ${isOut ? "items-end" : "items-start"}`}>
              <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${isOut ? "flex-row-reverse" : ""}`}>
                <span>{CHANNEL_ICONS[msg.channel] ?? "📨"}</span>
                <span>{isOut ? (msg.sdrName ?? "SDR") : "Contato"}</span>
                <span>·</span>
                <span>{date} {time}</span>
              </div>

              <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isOut ? `${outBubble} rounded-tr-sm` : `${inBubble} rounded-tl-sm`}`}>
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
      <div ref={bottomRef} />
    </div>
  );
}
