"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  action: (formData: FormData) => Promise<void>;
  broker: { name: string; email: string; phone: string; isActive: boolean };
  prefs: {
    creci: string;
    cities: string;
    neighborhoods: string;
    minPrice: string | number;
    maxPrice: string | number;
    propertyTypes: string[];
  };
  propertyTypes: { value: string; label: string }[];
}

export function BrokerEditForm({ action, broker, prefs, propertyTypes }: Props) {
  const router = useRouter();
  const [name, setName] = useState(broker.name);
  const [email, setEmail] = useState(broker.email);
  const [phone, setPhone] = useState(broker.phone);
  const [isActive, setIsActive] = useState(broker.isActive);
  const [creci, setCreci] = useState(prefs.creci);
  const [cities, setCities] = useState(prefs.cities);
  const [neighborhoods, setNeighborhoods] = useState(prefs.neighborhoods);
  const [minPrice, setMinPrice] = useState(String(prefs.minPrice));
  const [maxPrice, setMaxPrice] = useState(String(prefs.maxPrice));
  const [selectedTypes, setSelectedTypes] = useState<string[]>(prefs.propertyTypes);
  const [loading, setLoading] = useState(false);

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

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">

      {/* Dados pessoais */}
      <div className="space-y-4 pb-4 border-b">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dados pessoais</h3>
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <input id="phone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(16) 99999-9999" className={inputClass} />
          <p className="text-xs text-muted-foreground">Usado para notificações de novos leads via WhatsApp</p>
        </div>

        <div className="flex items-center gap-3">
          <Checkbox id="isActive" checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
          <div>
            <Label htmlFor="isActive" className="cursor-pointer font-medium">Corretor ativo</Label>
            <p className="text-xs text-muted-foreground">Inativos não recebem novos leads e não aparecem no routing</p>
          </div>
        </div>
      </div>

      {/* Preferências */}
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Preferências de afinidade</h3>

      <div className="space-y-2">
        <Label htmlFor="creci">CRECI</Label>
        <input id="creci" name="creci" value={creci} onChange={(e) => setCreci(e.target.value)} placeholder="CRECI-SP 123456" className={inputClass} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cities">Cidades de atuação</Label>
        <input id="cities" name="cities" value={cities} onChange={(e) => setCities(e.target.value)} placeholder="São Paulo, Guarulhos" className={inputClass} />
        <p className="text-xs text-muted-foreground">Separadas por vírgula</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="neighborhoods">Bairros de atuação</Label>
        <input id="neighborhoods" name="neighborhoods" value={neighborhoods} onChange={(e) => setNeighborhoods(e.target.value)} placeholder="Moema, Itaim Bibi" className={inputClass} />
        <p className="text-xs text-muted-foreground">Separados por vírgula</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minPrice">Valor mínimo (R$)</Label>
          <input id="minPrice" name="minPrice" type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="300000" className={inputClass} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxPrice">Valor máximo (R$)</Label>
          <input id="maxPrice" name="maxPrice" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="2000000" className={inputClass} />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Tipos de imóvel</Label>
        <div className="grid grid-cols-2 gap-2">
          {propertyTypes.map((pt) => (
            <div key={pt.value} className="flex items-center gap-2">
              <Checkbox
                id={pt.value}
                checked={selectedTypes.includes(pt.value)}
                onCheckedChange={() => toggleType(pt.value)}
              />
              <Label htmlFor={pt.value} className="font-normal cursor-pointer">{pt.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar alterações"}
        </Button>
        <BackButton />
      </div>
    </form>
  );
}
