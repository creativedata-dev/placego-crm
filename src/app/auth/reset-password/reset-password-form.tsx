"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  // Captura o token do hash e estabelece a sessão
  useEffect(() => {
    const hash = window.location.hash.slice(1); // remove o #
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      const supabase = createClient();
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (error) {
          setError("Link inválido ou expirado. Solicite um novo link de redefinição.");
        } else {
          setReady(true);
          // Limpa o hash da URL sem recarregar
          window.history.replaceState(null, "", window.location.pathname);
        }
      });
    } else {
      // Sem token no hash — verificar se já tem sessão ativa (recovery)
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setReady(true);
        } else {
          setError("Link inválido ou expirado. Solicite um novo link de redefinição.");
        }
      });
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  const inputClass = "w-full h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring";

  if (!ready && !error) {
    return <p className="text-sm text-muted-foreground text-center">Verificando link…</p>;
  }

  if (error && !ready) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => router.push("/login")}>Voltar ao login</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar senha</Label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="Repita a senha"
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Salvando..." : "Definir nova senha"}
      </Button>
    </form>
  );
}
