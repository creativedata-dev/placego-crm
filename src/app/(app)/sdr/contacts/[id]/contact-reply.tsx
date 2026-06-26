"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendContactMessage } from "@/app/actions/messages";
import { Send, Loader2 } from "lucide-react";

const CHANNELS = [
  { value: "whatsapp", label: "💬 WhatsApp", needsPhone: true },
  { value: "email", label: "✉️ Email", needsEmail: true },
  { value: "instagram_dm", label: "📸 Instagram DM", needsPhone: false },
  { value: "facebook_dm", label: "📘 Facebook DM", needsPhone: false },
];

interface Props {
  contactId: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactName: string;
  defaultChannel: string;
  tenantSlug: string | null;
}

export function ContactReply({
  contactId, contactPhone, contactEmail, contactName, defaultChannel, tenantSlug,
}: Props) {
  const [channel, setChannel] = useState(defaultChannel);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSendWhatsApp = !!contactPhone && !!tenantSlug;
  const canSendEmail = !!contactEmail;

  const canSend = channel === "whatsapp" ? canSendWhatsApp
    : channel === "email" ? canSendEmail
    : false;

  function handleSend() {
    if (!message.trim() || !canSend) return;
    setError(null);
    startTransition(async () => {
      const result = await sendContactMessage({
        contactId,
        channel,
        content: message.trim(),
        phone: contactPhone,
        email: contactEmail,
        name: contactName,
        instanceName: tenantSlug,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setMessage("");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-background">
      {/* Seletor de canal */}
      <div className="flex border-b bg-muted/30">
        {CHANNELS.map((ch) => {
          const available = ch.value === "whatsapp" ? canSendWhatsApp
            : ch.value === "email" ? canSendEmail
            : false;
          return (
            <button
              key={ch.value}
              onClick={() => available && setChannel(ch.value)}
              disabled={!available}
              className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2 ${
                channel === ch.value
                  ? "border-primary text-primary bg-background"
                  : available
                  ? "border-transparent text-muted-foreground hover:text-foreground"
                  : "border-transparent text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              {ch.label}
              {!available && <span className="ml-1 text-[10px]">(sem dados)</span>}
            </button>
          );
        })}
      </div>

      {/* Textarea */}
      <div className="p-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !canSend
              ? `Sem ${channel === "whatsapp" ? "telefone" : "email"} cadastrado para este contato`
              : `Digite a mensagem... (Ctrl+Enter para enviar)`
          }
          disabled={!canSend || isPending}
          rows={3}
          className="w-full text-sm outline-none resize-none bg-transparent placeholder:text-muted-foreground/50 disabled:opacity-50"
        />

        {error && <p className="text-xs text-destructive mt-1">{error}</p>}

        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {channel === "whatsapp" && canSendWhatsApp && `Enviando para ${contactPhone}`}
            {channel === "email" && canSendEmail && `Enviando para ${contactEmail}`}
          </p>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!message.trim() || !canSend || isPending}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
