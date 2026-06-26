"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const PROPERTY_TYPES = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
  { value: "cobertura", label: "Cobertura" },
  { value: "studio", label: "Studio" },
];

const ROLES = [
  { value: "corretor", label: "Corretor Interno (PlaceGo)" },
  { value: "corretor_tenant", label: "Corretor de Empresa" },
];

interface Props {
  action: (formData: FormData) => Promise<void>;
  tenants: { id: string; name: string }[];
}

export function NewBrokerForm({ action, tenants }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Dados pessoais
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("corretor");
  const [tenantId, setTenantId] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Preferências
  const [creci, setCreci] = useState("");
  const [cities, setCities] = useState("");
  const [neighborhoods, setNeighborhoods] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  function toggleType(value: string) {
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("phone", phone);
    fd.set("role", role);
    fd.set("tenantId", tenantId);
    fd.set("isActive", isActive ? "true" : "false");
    fd.set("creci", creci);
    fd.set("cities", cities);
    fd.set("neighborhoods", neighborhoods);
    fd.set("minPrice", minPrice);
    fd.set("maxPrice", maxPrice);
    selectedTypes.forEach((t) => fd.append("propertyTypes", t));
    await action(fd);
    setLoading(false);
    router.push("/brokers");
  }

  const inputClass = "w-full h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:opacity-50";
  const selectClass = `${inputClass} cursor-pointer`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">

      {/* Dados pessoais */}
      <div className="space-y-4 pb-5 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados pessoais</h3>

        <div className="space-y-2">
          <Label htmlFor="name">Nome completo *</Label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="João da Silva" className={inputClass} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="joao@email.com" className={inputClass} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(16) 99999-9999" className={inputClass} />
          <p className="text-xs text-muted-foreground">Usado para notificações de leads via WhatsApp</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role">Perfil *</Label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)} required className={selectClass}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantId">Empresa</Label>
            <select id="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} className={selectClass}>
              <option value="">Nenhuma (interno)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Ativo / Inativo */}
        <div className="flex items-center gap-3 pt-1">
          <Checkbox
            id="isActive"
            checked={isActive}
            onCheckedChange={(v) => setIsActive(!!v)}
          />
          <div>
            <Label htmlFor="isActive" className="cursor-pointer font-medium">Corretor ativo</Label>
            <p className="text-xs text-muted-foreground">Inativos não recebem novos leads e não aparecem no routing</p>
          </div>
        </div>
      </div>

      {/* Preferências de afinidade */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Preferências de afinidade</h3>
        <p className="text-xs text-muted-foreground -mt-2">Usadas pelo sistema para sugerir corretores no Lead Routing</p>

        <div className="space-y-2">
          <Label htmlFor="creci">CRECI</Label>
          <input id="creci" value={creci} onChange={(e) => setCreci(e.target.value)} placeholder="CRECI-SP 123456" className={inputClass} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cities">Cidades de atuação</Label>
          <input id="cities" value={cities} onChange={(e) => setCities(e.target.value)} placeholder="São Paulo, Guarulhos, Osasco" className={inputClass} />
          <p className="text-xs text-muted-foreground">Separadas por vírgula · +35 pts no score</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhoods">Bairros de atuação</Label>
          <input id="neighborhoods" value={neighborhoods} onChange={(e) => setNeighborhoods(e.target.value)} placeholder="Moema, Itaim Bibi, Vila Olímpia" className={inputClass} />
          <p className="text-xs text-muted-foreground">Separados por vírgula · +20 pts no score</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minPrice">Valor mínimo (R$)</Label>
            <input id="minPrice" type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="300000" className={inputClass} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPrice">Valor máximo (R$)</Label>
            <input id="maxPrice" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="2000000" className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Faixa de valor · +25 pts no score</p>

        <div className="space-y-3">
          <Label>Tipos de imóvel <span className="text-muted-foreground font-normal">(+20 pts)</span></Label>
          <div className="grid grid-cols-2 gap-2">
            {PROPERTY_TYPES.map((pt) => (
              <div key={pt.value} className="flex items-center gap-2">
                <Checkbox
                  id={`type-${pt.value}`}
                  checked={selectedTypes.includes(pt.value)}
                  onCheckedChange={() => toggleType(pt.value)}
                />
                <Label htmlFor={`type-${pt.value}`} className="font-normal cursor-pointer">{pt.label}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t">
        <Button type="submit" disabled={loading}>
          {loading ? "Cadastrando..." : "Cadastrar corretor"}
        </Button>
        <BackButton />
      </div>
    </form>
  );
}
