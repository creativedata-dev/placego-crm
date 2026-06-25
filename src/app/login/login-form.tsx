"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RATE_LIMIT_COOLDOWN = 60; // segundos

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  function startCooldown(seconds: number) {
    setCooldown(seconds);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0 || loading) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message.toLowerCase();

      if (msg.includes("rate") || msg.includes("too many") || msg.includes("over_email_send_rate_limit")) {
        setError(`Muitas tentativas. Aguarde ${RATE_LIMIT_COOLDOWN} segundos antes de tentar novamente.`);
        startCooldown(RATE_LIMIT_COOLDOWN);
      } else if (msg.includes("invalid") || msg.includes("credentials")) {
        setError("Email ou senha incorretos.");
      } else {
        setError("Erro ao entrar. Tente novamente.");
      }

      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const isBlocked = cooldown > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isBlocked || loading}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isBlocked || loading}
          required
        />
      </div>

      {error && (
        <div className={`text-sm rounded-md px-3 py-2 ${isBlocked ? "bg-yellow-50 text-yellow-800 border border-yellow-200" : "text-destructive"}`}>
          {error}
          {isBlocked && (
            <span className="block font-semibold mt-0.5">
              Liberado em {cooldown}s…
            </span>
          )}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={loading || isBlocked}
      >
        {isBlocked
          ? `Aguarde ${cooldown}s`
          : loading
          ? "Entrando..."
          : "Entrar"}
      </Button>
    </form>
  );
}
