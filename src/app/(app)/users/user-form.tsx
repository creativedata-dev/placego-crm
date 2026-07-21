"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const ROLES = [
  { value: "admin_placego", label: "Admin PlaceGo", desc: "Acesso total ao sistema" },
  { value: "sdr", label: "SDR", desc: "Fila de contatos e qualificação" },
  { value: "corretor", label: "Corretor", desc: "Pipeline de vendas (interno PlaceGo)" },
  { value: "admin_tenant", label: "Admin Empresa", desc: "Painel da empresa parceira" },
  { value: "corretor_tenant", label: "Corretor Empresa", desc: "Pipeline de vendas (empresa parceira)" },
];

interface Props {
  action: (formData: FormData) => Promise<void>;
  tenants: { id: string; name: string }[];
  defaultValues?: {
    name: string;
    email: string;
    role: string;
    tenantId: string | null;
    phone: string | null;
    isActive: boolean;
  };
}

export function UserForm({ action, tenants, defaultValues }: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [email, setEmail] = useState(defaultValues?.email ?? "");
  const [role, setRole] = useState(defaultValues?.role ?? "sdr");
  const [tenantId, setTenantId] = useState(defaultValues?.tenantId ?? "");
  const [phone, setPhone] = useState(defaultValues?.phone ?? "");
  const [loading, setLoading] = useState(false);

  const needsTenant = role === "admin_tenant" || role === "corretor_tenant";
  const canHaveTenant = needsTenant || role === "sdr" || role === "corretor";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("role", role);
    fd.set("tenantId", tenantId);
    fd.set("phone", phone);
    await action(fd);
    setLoading(false);
    router.push("/users");
  }

  const inputClass = "w-full h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring";
  const selectClass = `${inputClass} cursor-pointer`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">

      {/* Dados de acesso */}
      <div className="space-y-4 pb-5 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados de acesso</h3>

        <div className="space-y-2">
          <Label htmlFor="name">Nome completo *</Label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="João da Silva" className={inputClass} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="joao@placego.com.br" className={inputClass} />
          {!defaultValues && (
            <p className="text-xs text-muted-foreground">Uma senha temporária será gerada automaticamente.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(16) 99999-9999" className={inputClass} />
        </div>
      </div>

      {/* Perfil de acesso */}
      <div className="space-y-4 pb-5 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Perfil de acesso</h3>

        <div className="space-y-2">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                role === r.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Empresa — obrigatório para tenant roles, opcional para SDR */}
        {canHaveTenant && (
          <div className="space-y-2">
            <Label htmlFor="tenantId">
              Empresa vinculada {needsTenant ? "*" : "(opcional)"}
            </Label>
            {(role === "sdr" || role === "corretor") && (
              <p className="text-xs text-muted-foreground">
                {role === "sdr"
                  ? "SDR vinculado a uma empresa recebe leads apenas daquela empresa no round-robin."
                  : "Corretor vinculado a uma empresa aparece identificado na tela de distribuição de leads."}
              </p>
            )}
            <select
              id="tenantId"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              required={needsTenant}
              className={selectClass}
            >
              <option value="">{needsTenant ? "Selecione a empresa" : "Sem empresa (pool geral)"}</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : defaultValues ? "Salvar alterações" : "Criar usuário"}
        </Button>
        <BackButton />
      </div>
    </form>
  );
}
