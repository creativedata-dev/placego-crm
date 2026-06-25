"use client";

import { useActionState } from "react";
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
import type { Tenant } from "@/db/schema";

interface TenantFormProps {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<Tenant>;
}

export function TenantForm({ action, defaultValues }: TenantFormProps) {
  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return (
    <form action={action} className="space-y-5 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name}
          required
          placeholder="Ex: Imóveis Lisboa"
          onChange={(e) => {
            const slugEl = document.getElementById("slug") as HTMLInputElement;
            if (slugEl && !defaultValues?.slug) slugEl.value = generateSlug(e.target.value);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo *</Label>
        <Select name="type" defaultValue={defaultValues?.type ?? "imobiliaria"} required>
          <SelectTrigger id="type">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="imobiliaria">Imobiliária</SelectItem>
            <SelectItem value="incorporadora">Incorporadora</SelectItem>
            <SelectItem value="construtora">Construtora</SelectItem>
            <SelectItem value="corretor">Corretor Autônomo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL) *</Label>
        <Input
          id="slug"
          name="slug"
          defaultValue={defaultValues?.slug}
          required
          placeholder="imoveis-lisboa"
          pattern="[a-z0-9\-]+"
          title="Apenas letras minúsculas, números e hífens"
        />
        <p className="text-xs text-muted-foreground">
          Usado na URL: /tenant/<strong>slug</strong>
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit">
          {defaultValues?.id ? "Salvar alterações" : "Criar tenant"}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
