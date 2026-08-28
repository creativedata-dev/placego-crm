"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserPassword } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const ROLES_ALL = [
  { value: "admin_placego", label: "Admin PlaceGo", desc: "Acesso total ao sistema" },
  { value: "sdr", label: "SDR", desc: "Fila de contatos e qualificação" },
  { value: "corretor", label: "Corretor", desc: "Pipeline de vendas (interno PlaceGo)" },
  { value: "admin_tenant", label: "Admin Empresa", desc: "Painel da empresa parceira" },
  { value: "corretor_tenant", label: "Corretor Empresa", desc: "Pipeline de vendas (empresa parceira)" },
  { value: "gestor_imobiliaria", label: "Gestor de Imobiliária", desc: "Recebe leads do SDR e distribui para seus corretores" },
];

const ROLES_TENANT = [
  { value: "admin_tenant", label: "Admin Empresa", desc: "Acesso ao painel e gestão de usuários da empresa" },
  { value: "corretor_tenant", label: "Corretor Empresa", desc: "Pipeline de vendas" },
  { value: "gestor_imobiliaria", label: "Gestor de Imobiliária", desc: "Recebe leads do SDR e distribui para seus corretores" },
];

interface Props {
  action: (formData: FormData) => Promise<void>;
  tenants: { id: string; name: string }[];
  isAdminTenant?: boolean;
  userId?: string; // presente somente na edição
  defaultValues?: {
    name: string;
    email: string;
    role: string;
    tenantId: string | null;
    phone: string | null;
    isActive: boolean;
  };
}

export function UserForm({ action, tenants, defaultValues, isAdminTenant = false, userId }: Props) {
  const router = useRouter();
  const ROLES = isAdminTenant ? ROLES_TENANT : ROLES_ALL;
  const defaultRole = isAdminTenant ? "corretor_tenant" : "sdr";
  const isEditing = !!defaultValues;

  const [name, setName] = useState(defaultValues?.name ?? "");
  const [email, setEmail] = useState(defaultValues?.email ?? "");
  const [role, setRole] = useState(defaultValues?.role ?? defaultRole);
  const [tenantId, setTenantId] = useState(defaultValues?.tenantId ?? "");
  const [phone, setPhone] = useState(defaultValues?.phone ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsTenant = !isAdminTenant && (role === "admin_tenant" || role === "corretor_tenant" || role === "gestor_imobiliaria");
  const canHaveTenant = !isAdminTenant && (needsTenant || role === "sdr" || role === "corretor");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("role", role);
    fd.set("tenantId", tenantId);
    fd.set("phone", phone);
    if (!isEditing && password) fd.set("password", password);
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
        </div>

        {/* Senha — campo na criação; seção separada na edição */}
        {!isEditing ? (
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para gerar automaticamente"
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">Mín. 6 caracteres. Se em branco, uma senha aleatória é gerada.</p>
          </div>
        ) : userId && (
          <div className="space-y-2 rounded-lg border border-dashed p-3 bg-muted/20">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Redefinir senha</Label>
            <div className="flex gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova senha (mín. 6 caracteres)"
                className={`flex-1 h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50`}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="text-xs text-muted-foreground border rounded-md px-2.5 hover:bg-muted">
                {showPassword ? "Ocultar" : "Ver"}
              </button>
              <button
                type="button"
                disabled={pwSaving || password.length < 6}
                onClick={async () => {
                  if (!userId || password.length < 6) return;
                  setPwSaving(true); setPwMsg(null);
                  const res = await setUserPassword(userId, password);
                  setPwMsg(res.ok ? "Senha alterada com sucesso!" : (res.error ?? "Erro"));
                  if (res.ok) setPassword("");
                  setPwSaving(false);
                }}
                className="text-xs font-semibold bg-primary text-primary-foreground rounded-md px-3 h-8 disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                {pwSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
            {pwMsg && (
              <p className={`text-xs ${pwMsg.includes("sucesso") ? "text-green-600" : "text-red-600"}`}>{pwMsg}</p>
            )}
          </div>
        )}

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
