import { notFound } from "next/navigation";
import { db } from "@/db";
import { users, brokerPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { updateBrokerPreferences } from "@/app/actions/brokers";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const PROPERTY_TYPES = [
  { value: "apartamento", label: "Apartamento" },
  { value: "casa", label: "Casa" },
  { value: "comercial", label: "Comercial" },
  { value: "terreno", label: "Terreno" },
  { value: "cobertura", label: "Cobertura" },
  { value: "studio", label: "Studio" },
];

export default async function EditBrokerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin_placego", "admin_tenant"]);
  const { id } = await params;

  const [[broker], [prefs]] = await Promise.all([
    db.select().from(users).where(eq(users.id, id)).limit(1),
    db.select().from(brokerPreferences).where(eq(brokerPreferences.brokerId, id)).limit(1),
  ]);

  if (!broker) notFound();

  const action = updateBrokerPreferences.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Editar Corretor</h1>
        <p className="text-muted-foreground text-sm">{broker.name} · {broker.email}</p>
      </div>

      <form action={action} className="space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label htmlFor="creci">CRECI</Label>
          <Input id="creci" name="creci" defaultValue={prefs?.creci ?? ""} placeholder="CRECI-SP 123456" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cities">Cidades de atuação</Label>
          <Input
            id="cities"
            name="cities"
            defaultValue={prefs?.cities?.join(", ") ?? ""}
            placeholder="São Paulo, Guarulhos, Osasco"
          />
          <p className="text-xs text-muted-foreground">Separadas por vírgula</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhoods">Bairros de atuação</Label>
          <Input
            id="neighborhoods"
            name="neighborhoods"
            defaultValue={prefs?.neighborhoods?.join(", ") ?? ""}
            placeholder="Moema, Itaim Bibi, Vila Olímpia"
          />
          <p className="text-xs text-muted-foreground">Separados por vírgula</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minPrice">Valor mínimo (R$)</Label>
            <Input id="minPrice" name="minPrice" type="number" defaultValue={prefs?.minPrice ?? ""} placeholder="300000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPrice">Valor máximo (R$)</Label>
            <Input id="maxPrice" name="maxPrice" type="number" defaultValue={prefs?.maxPrice ?? ""} placeholder="2000000" />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Tipos de imóvel</Label>
          <div className="grid grid-cols-2 gap-2">
            {PROPERTY_TYPES.map((pt) => (
              <div key={pt.value} className="flex items-center gap-2">
                <Checkbox
                  id={pt.value}
                  name="propertyTypes"
                  value={pt.value}
                  defaultChecked={prefs?.propertyTypes?.includes(pt.value)}
                />
                <Label htmlFor={pt.value} className="font-normal cursor-pointer">
                  {pt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit">Salvar preferências</Button>
          <BackButton />
        </div>
      </form>
    </div>
  );
}
