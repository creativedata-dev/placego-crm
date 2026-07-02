"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { sendContactMessage, sendContactMedia } from "@/app/actions/messages";
import { Send, Loader2, Paperclip, X, Mic, Square } from "lucide-react";

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
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canSendWhatsApp = !!contactPhone && !!tenantSlug;
  const canSendEmail = !!contactEmail;
  const canSend = channel === "whatsapp" ? canSendWhatsApp : channel === "email" ? canSendEmail : false;
  const canSendMedia = channel === "whatsapp" && canSendWhatsApp;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setAudioBlob(null);
    }
  }

  function removeAttachment() {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/ogg; codecs=opus" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setAudioDuration(0);
      timerRef.current = setInterval(() => setAudioDuration((d) => d + 1), 1000);
    } catch {
      setError("Não foi possível acessar o microfone");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function removeAudio() {
    setAudioBlob(null);
    setAudioDuration(0);
  }

  function toBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function handleSend() {
    if (!canSend) return;
    setError(null);

    startTransition(async () => {
      try {
        if (audioBlob) {
          const base64 = await toBase64(audioBlob);
          const result = await sendContactMedia({
            contactId,
            phone: contactPhone,
            instanceName: tenantSlug,
            mediaType: "audio",
            base64,
            mimeType: "audio/ogg",
            caption: "",
            fileName: "audio.ogg",
          });
          if (result?.error) { setError(result.error); return; }
          setAudioBlob(null);
          setAudioDuration(0);
        } else if (attachedFile) {
          const base64 = await toBase64(attachedFile);
          const mimeType = attachedFile.type;
          const mediaType = mimeType.startsWith("image/") ? "image"
            : mimeType.startsWith("video/") ? "video"
            : mimeType.startsWith("audio/") ? "audio"
            : "document";
          const result = await sendContactMedia({
            contactId,
            phone: contactPhone,
            instanceName: tenantSlug,
            mediaType,
            base64,
            mimeType,
            caption: message.trim(),
            fileName: attachedFile.name,
          });
          if (result?.error) { setError(result.error); return; }
          setAttachedFile(null);
          setMessage("");
          if (fileInputRef.current) fileInputRef.current.value = "";
        } else {
          if (!message.trim()) return;
          const result = await sendContactMessage({
            contactId, channel, content: message.trim(),
            phone: contactPhone, email: contactEmail,
            name: contactName, instanceName: tenantSlug,
          });
          if (result?.error) { setError(result.error); return; }
          setMessage("");
        }
      } catch (err: any) {
        setError(err.message ?? "Erro ao enviar");
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
            : ch.value === "email" ? canSendEmail : false;
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

      <div className="p-3 space-y-2">
        {/* Preview de arquivo anexado */}
        {attachedFile && (
          <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-2.5 py-1.5">
            <span className="truncate flex-1">📎 {attachedFile.name}</span>
            <button onClick={removeAttachment} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Preview de áudio gravado */}
        {audioBlob && (
          <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-2.5 py-1.5">
            <span>🎙️ Áudio ({audioDuration}s)</span>
            <audio controls src={URL.createObjectURL(audioBlob)} className="h-7 flex-1" />
            <button onClick={removeAudio} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Gravando */}
        {isRecording && (
          <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Gravando... {audioDuration}s
          </div>
        )}

        {/* Textarea — só mostra se não tem áudio gravado */}
        {!audioBlob && (
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !canSend
                ? channel === "whatsapp"
                  ? !contactPhone ? "Sem telefone cadastrado" : "Empresa sem WhatsApp configurado"
                  : "Sem email cadastrado"
                : attachedFile ? "Legenda (opcional)..." : "Digite a mensagem... (Ctrl+Enter para enviar)"
            }
            disabled={!canSend || isPending || isRecording}
            rows={3}
            className="w-full text-sm outline-none resize-none bg-transparent placeholder:text-muted-foreground/50 disabled:opacity-50"
          />
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-1 border-t gap-2">
          <div className="flex gap-1">
            {/* Anexar arquivo — só WhatsApp */}
            {canSendMedia && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending || isRecording || !!audioBlob}
                  title="Anexar arquivo"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </Button>

                {/* Gravação de áudio */}
                {!isRecording ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={startRecording}
                    disabled={isPending || !!attachedFile || !!audioBlob}
                    title="Gravar áudio"
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-500"
                    onClick={stopRecording}
                    title="Parar gravação"
                  >
                    <Square className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <p className="text-xs text-muted-foreground">
              {channel === "whatsapp" && canSendWhatsApp && `→ ${contactPhone}`}
              {channel === "email" && canSendEmail && `→ ${contactEmail}`}
            </p>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={(!message.trim() && !attachedFile && !audioBlob) || !canSend || isPending || isRecording}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
