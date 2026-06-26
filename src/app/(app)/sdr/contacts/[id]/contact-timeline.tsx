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
              {/* Remetente */}
              <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${isOut ? "flex-row-reverse" : ""}`}>
                <span>{CHANNEL_ICONS[msg.channel] ?? "📨"}</span>
                <span>{isOut ? (msg.sdrName ?? "SDR") : "Contato"}</span>
                <span>·</span>
                <span>{date} {time}</span>
              </div>

              {/* Balão */}
              <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                isOut
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-background border rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
