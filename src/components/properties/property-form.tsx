"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Property, Tenant } from "@/db/schema";

interface PropertyFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<Property>;
  tenants: Pick<Tenant, "id" | "name">[];
}

export function PropertyForm({ action, defaultValues, tenants }: PropertyFormProps) {
  return (
    <form action={action} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tenantId">Tenant *</Label>
          <Select name="tenantId" defaultValue={defaultValues?.tenantId ?? ""} required>
            <SelectTrigger id="tenantId">
              <SelectValue placeholder="Selecione o tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Select name="type" defaultValue={defaultValues?.type ?? "apartamento"} required>
            <SelectTrigger id="type">
              <SelectValue placeholder="Tipo do imóvel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apartamento">Apartamento</SelectItem>
              <SelectItem value="casa">Casa</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="terreno">Terreno</SelectItem>
              <SelectItem value="cobertura">Cobertura</SelectItem>
              <SelectItem value="studio">Studio</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Endereço *</Label>
        <Input id="address" name="address" defaultValue={defaultValues?.address} required placeholder="Rua, número" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro *</Label>
          <Input id="neighborhood" name="neighborhood" defaultValue={defaultValues?.neighborhood} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Cidade *</Label>
          <Input id="city" name="city" defaultValue={defaultValues?.city} required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Valor (R$)</Label>
          <Input id="price" name="price" type="number" step="0.01" defaultValue={defaultValues?.price ?? ""} placeholder="450000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="areaM2">Área (m²)</Label>
          <Input id="areaM2" name="areaM2" type="number" step="0.01" defaultValue={defaultValues?.areaM2 ?? ""} placeholder="80" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bedrooms">Quartos</Label>
          <Input id="bedrooms" name="bedrooms" type="number" defaultValue={defaultValues?.bedrooms ?? ""} placeholder="2" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="suites">Suítes</Label>
          <Input id="suites" name="suites" type="number" defaultValue={defaultValues?.suites ?? ""} placeholder="1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parkingSpots">Vagas</Label>
          <Input id="parkingSpots" name="parkingSpots" type="number" defaultValue={defaultValues?.parkingSpots ?? ""} placeholder="1" />
        </div>
      </div>

      {defaultValues?.id && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={defaultValues?.status ?? "ativo"}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="vendido">Vendido</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit">
          {defaultValues?.id ? "Salvar alterações" : "Cadastrar imóvel"}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
