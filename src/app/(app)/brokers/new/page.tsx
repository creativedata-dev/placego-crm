import { db } from "@/db";
import { tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { createBroker } from "@/app/actions/brokers";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function NewBrokerPage() {
  await requireRole(["admin_placego", "admin_tenant"]);
  const tenantList = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Corretor</h1>
        <p className="text-muted-foreground text-sm">
          Um email de acesso será enviado automaticamente
        </p>
      </div>

      <form action={createBroker} className="space-y-5 max-w-lg">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo *</Label>
          <Input id="name" name="name" required placeholder="João da Silva" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" name="email" type="email" required placeholder="joao@email.com" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <Input id="phone" name="phone" placeholder="(11) 99999-9999" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="creci">CRECI</Label>
          <Input id="creci" name="creci" placeholder="CRECI-SP 123456" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Perfil *</Label>
          <Select name="role" defaultValue="corretor" required>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corretor">Corretor Interno (PlaceGo)</SelectItem>
              <SelectItem value="corretor_tenant">Corretor de Tenant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tenantId">Tenant (se corretor de tenant)</Label>
          <Select name="tenantId">
            <SelectTrigger id="tenantId">
              <SelectValue placeholder="Nenhum (corretor interno)" />
            </SelectTrigger>
            <SelectContent>
              {tenantList.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit">Cadastrar corretor</Button>
          <BackButton />
        </div>
      </form>
    </div>
  );
}
